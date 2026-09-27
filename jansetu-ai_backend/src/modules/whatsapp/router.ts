import axios from 'axios';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { logger } from '../../middleware/logger';
import { transcribeAudio } from '../../services/gemini';
import { ingestCitizenRequest } from '../../services/ingest';

const TwilioPayloadSchema = z
  .object({
    MessageSid: z.string().optional(),
    From: z.string().optional(),
    Body: z.string().optional(),
    NumMedia: z.string().optional(),
    MediaUrl0: z.string().url().optional(),
    MediaContentType0: z.string().optional(),
    ProfileName: z.string().optional(),
  })
  .passthrough();

// Bounded in-memory de-dupe; Twilio retries webhooks up to ~5 times on 5xx, Meta up to 24h.
const processedSids = new Set<string>();
const MAX_SID_MEMORY = 1000;

function rememberSid(sid: string): boolean {
  if (processedSids.has(sid)) return false;
  processedSids.add(sid);
  if (processedSids.size > MAX_SID_MEMORY) {
    const first = processedSids.values().next().value;
    if (first) processedSids.delete(first);
  }
  return true;
}

function stripWhatsappPrefix(from?: string): string | undefined {
  if (!from) return undefined;
  return from.replace(/^whatsapp:/i, '').trim();
}

function twiml(message: string): string {
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

async function downloadTwilioMedia(url: string): Promise<{ base64: string; contentType: string }> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are required to fetch media');
  }
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    auth: { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN },
    maxContentLength: 20 * 1024 * 1024,
  });
  const contentType = String(res.headers['content-type'] ?? 'audio/ogg').split(';')[0].trim();
  return { base64: Buffer.from(res.data).toString('base64'), contentType };
}

// --- Meta WhatsApp Cloud API ---

const META_GRAPH_BASE = 'https://graph.facebook.com/v20.0';

const MetaMessageSchema = z.object({
  from: z.string().optional(),
  id: z.string().optional(),
  type: z.string().optional(),
  text: z.object({ body: z.string() }).optional(),
  audio: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  voice: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
});

const MetaWebhookSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                messages: z.array(MetaMessageSchema).optional(),
                contacts: z
                  .array(z.object({ profile: z.object({ name: z.string() }).optional() }).passthrough())
                  .optional(),
              }).passthrough(),
            }).passthrough(),
          )
          .optional(),
      }).passthrough(),
    )
    .optional(),
});

async function downloadMetaMedia(mediaId: string): Promise<{ base64: string; contentType: string }> {
  if (!env.META_ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN is required to fetch media');
  }
  const meta = await axios.get<{ url: string; mime_type?: string }>(`${META_GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` },
    timeout: 15_000,
  });
  const bin = await axios.get<ArrayBuffer>(meta.data.url, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}` },
    maxContentLength: 20 * 1024 * 1024,
  });
  const contentType = String(meta.data.mime_type ?? bin.headers['content-type'] ?? 'audio/ogg')
    .split(';')[0]
    .trim();
  return { base64: Buffer.from(bin.data).toString('base64'), contentType };
}

export const whatsappRouter = Router();

whatsappRouter.post('/twilio', async (req, res) => {
  const payload = TwilioPayloadSchema.parse(req.body ?? {});
  const sid = payload.MessageSid ?? `sid_${Date.now()}`;
  if (!rememberSid(sid)) {
    res.type('text/xml').send(twiml('Already received, thank you.'));
    return;
  }

  const phone = stripWhatsappPrefix(payload.From);
  const citizenName = payload.ProfileName;
  const numMedia = Number(payload.NumMedia ?? '0');

  try {
    if (numMedia > 0 && payload.MediaUrl0 && payload.MediaContentType0?.startsWith('audio/')) {
      const { base64, contentType } = await downloadTwilioMedia(payload.MediaUrl0);
      const asr = await transcribeAudio(base64, contentType);
      const created = await ingestCitizenRequest({
        channel: 'whatsapp',
        citizenName,
        phone,
        transcript: asr.transcript,
        rawText: asr.translationEn || asr.transcript,
        detectedLangHint: asr.detectedLanguage,
      });
      res.type('text/xml').send(
        twiml(
          `Namaste! Your voice note was received. Category: ${created.category.replace('_', ' ')}. District: ${created.district}. JanSetu request #${created.id}.`,
        ),
      );
      return;
    }

    const body = payload.Body?.trim();
    if (!body) {
      res.type('text/xml').send(twiml('Please send a text message or a voice note describing your issue.'));
      return;
    }

    const created = await ingestCitizenRequest({
      channel: 'whatsapp',
      citizenName,
      phone,
      rawText: body,
    });
    res.type('text/xml').send(
      twiml(
        `Received. Category: ${created.category.replace('_', ' ')}. District: ${created.district}. JanSetu request #${created.id}.`,
      ),
    );
  } catch (err) {
    logger.error({ err, sid }, 'twilio whatsapp ingest failed');
    res.type('text/xml').send(twiml('Sorry, something went wrong. Please try again shortly.'));
  }
});

whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (!env.META_VERIFY_TOKEN) {
    logger.warn('meta webhook verify hit but META_VERIFY_TOKEN is unset');
    res.sendStatus(403);
    return;
  }
  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN && typeof challenge === 'string') {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

whatsappRouter.post('/webhook', async (req, res) => {
  // Meta expects a 200 within a few seconds, otherwise it will retry.
  res.sendStatus(200);

  if (!env.META_ACCESS_TOKEN) {
    logger.debug('meta webhook POST ignored: META_ACCESS_TOKEN is unset');
    return;
  }

  let parsed: z.infer<typeof MetaWebhookSchema>;
  try {
    parsed = MetaWebhookSchema.parse(req.body ?? {});
  } catch (err) {
    logger.warn({ err }, 'meta webhook payload did not validate');
    return;
  }

  for (const entry of parsed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const contactName = value.contacts?.[0]?.profile?.name;
      for (const msg of value.messages ?? []) {
        const sid = msg.id ?? `wa_${Date.now()}`;
        if (!rememberSid(sid)) continue;
        try {
          if (msg.type === 'text' && msg.text?.body) {
            await ingestCitizenRequest({
              channel: 'whatsapp',
              citizenName: contactName,
              phone: msg.from,
              rawText: msg.text.body,
            });
          } else if ((msg.type === 'audio' || msg.type === 'voice')) {
            const audio = msg.audio ?? msg.voice;
            if (!audio) continue;
            const { base64, contentType } = await downloadMetaMedia(audio.id);
            const asr = await transcribeAudio(base64, contentType);
            await ingestCitizenRequest({
              channel: 'whatsapp',
              citizenName: contactName,
              phone: msg.from,
              transcript: asr.transcript,
              rawText: asr.translationEn || asr.transcript,
              detectedLangHint: asr.detectedLanguage,
            });
          } else {
            logger.info({ type: msg.type, sid }, 'meta webhook message type not handled');
          }
        } catch (err) {
          logger.error({ err, sid }, 'meta webhook ingest failed');
        }
      }
    }
  }
});
