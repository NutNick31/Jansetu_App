import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../middleware/logger';
import { requirePolicymaker } from '../../middleware/auth';
import { transcribeAudio } from '../../services/gemini';
import { ingestCitizenRequest } from '../../services/ingest';
import { docIdFor, nudgesCol } from '../../services/firestore';
import { downloadTelegramFile, sendTelegramMessage } from '../../services/telegramSender';
import type { NudgeAlert } from '../../types/domain';

const TelegramUpdateSchema = z.object({
  update_id: z.number().optional(),
  message: z
    .object({
      message_id: z.number().optional(),
      from: z
        .object({
          id: z.number().optional(),
          username: z.string().optional(),
          first_name: z.string().optional(),
        })
        .optional(),
      chat: z.object({ id: z.number(), type: z.string().optional() }),
      date: z.number().optional(),
      text: z.string().optional(),
      voice: z.object({ file_id: z.string(), mime_type: z.string().optional() }).optional(),
      audio: z.object({ file_id: z.string(), mime_type: z.string().optional() }).optional(),
    })
    .optional(),
});

const processedUpdates = new Set<number>();

function rememberUpdate(id: number | undefined): boolean {
  if (id === undefined) return true;
  if (processedUpdates.has(id)) return false;
  processedUpdates.add(id);
  if (processedUpdates.size > 1000) {
    const first = processedUpdates.values().next().value;
    if (first !== undefined) processedUpdates.delete(first);
  }
  return true;
}

export const telegramRouter = Router();

telegramRouter.post('/webhook', async (req, res) => {
  // Ack immediately so Telegram doesn't retry.
  res.sendStatus(200);

  let parsed: z.infer<typeof TelegramUpdateSchema>;
  try {
    parsed = TelegramUpdateSchema.parse(req.body ?? {});
  } catch (err) {
    logger.warn({ err }, 'telegram webhook payload did not validate');
    return;
  }

  const msg = parsed.message;
  if (!msg) return;
  if (!rememberUpdate(parsed.update_id)) return;

  const chatId = msg.chat.id;
  const senderName =
    msg.from?.first_name ?? (msg.from?.username ? `@${msg.from.username}` : 'Telegram User');
  const senderPhone = msg.from?.id ? `tg:${msg.from.id}` : undefined;

  try {
    const audioFile = msg.voice ?? msg.audio;
    if (audioFile) {
      const download = await downloadTelegramFile(audioFile.file_id);
      if (!download) {
        await sendTelegramMessage(chatId, 'Sorry, we could not fetch your voice note. Please try again.');
        return;
      }
      const contentType = audioFile.mime_type ?? download.contentType;
      const asr = await transcribeAudio(download.base64, contentType);
      const created = await ingestCitizenRequest({
        channel: 'telegram',
        citizenName: senderName,
        phone: senderPhone,
        transcript: asr.transcript,
        rawText: asr.translationEn || asr.transcript,
        detectedLangHint: asr.detectedLanguage,
      });
      await sendTelegramMessage(
        chatId,
        `Namaste ${senderName}! Voice note received.\n\nDetected: ${asr.detectedLanguage}\nTranscript: ${asr.transcript.slice(0, 120)}\n\nCategory: ${created.category.replace('_', ' ')}\nDistrict: ${created.district}, ${created.state}\nJanSetu request #${created.id}`,
      );
      return;
    }

    const body = msg.text?.trim();
    if (!body) {
      await sendTelegramMessage(chatId, 'Namaste! Please send a text description or a voice note about the infrastructure issue in your area.');
      return;
    }

    if (body === '/start' || body === '/help') {
      await sendTelegramMessage(
        chatId,
        `Namaste ${senderName}! I am the JanSetu AI Citizen Bot.\n\nSend me a message in any Indian language describing an infrastructure problem in your area — broken road, missing water, damaged school, PHC issue — and mention:\n1. What is broken\n2. Where (pincode or landmark)\n3. How many people affected\n\nI will route it to NITI Aayog planners and reply with your case ID. You can also send voice notes.`,
      );
      return;
    }

    const created = await ingestCitizenRequest({
      channel: 'telegram',
      citizenName: senderName,
      phone: senderPhone,
      rawText: body,
    });
    await sendTelegramMessage(
      chatId,
      `Namaste ${senderName}! Received.\n\nCategory: ${created.category.replace('_', ' ')}\nDistrict: ${created.district}, ${created.state}\nAffected: ${created.affectedPeople.toLocaleString()} citizens\nUrgency: ${created.urgencyScore}/10\n\nJanSetu request #${created.id}`,
    );
  } catch (err) {
    logger.error({ err, chatId }, 'telegram ingest failed');
    try {
      await sendTelegramMessage(chatId, 'Sorry, something went wrong. Please try again shortly.');
    } catch {
      // Swallow - already logged.
    }
  }
});

const DirectSendSchema = z.object({
  chatId: z.union([z.string().min(1), z.number()]).transform((v) => String(v).trim()),
  text: z.string().min(1).max(4096),
});

// Ad-hoc dispatch: policymaker types chat_id + message, bot DMs the citizen. Also logs a NudgeAlert.
telegramRouter.post('/send', requirePolicymaker, async (req, res) => {
  const { chatId, text } = DirectSendSchema.parse(req.body ?? {});
  const dispatch = await sendTelegramMessage(chatId, text);

  const id = docIdFor('nudge');
  const nudge: NudgeAlert = {
    id,
    citizenPhone: `tg:${chatId}`,
    requestId: 'manual',
    channel: 'telegram',
    statusText: text,
    sentTimestamp: new Date().toISOString(),
    read: false,
  };
  try {
    await nudgesCol().doc(id).set(nudge);
  } catch (err) {
    logger.warn({ err, id }, 'failed to persist manual telegram nudge log');
  }
  res.json({ nudge, dispatched: dispatch.dispatched, reason: dispatch.reason });
});
