import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { requirePolicymaker } from '../../middleware/auth';
import { logger } from '../../middleware/logger';
import { docIdFor, getById, listAll, nudgesCol, requestsCol } from '../../services/firestore';
import { sendTelegramMessage } from '../../services/telegramSender';
import { sendSMS, sendWhatsApp, type DispatchResult } from '../../services/twilioSender';
import type { NudgeAlert, CitizenRequest } from '../../types/domain';

type NudgeChannel = 'whatsapp' | 'sms' | 'telegram';

const SendBodySchema = z.object({
  requestId: z.string().min(1),
  statusText: z.string().min(1).max(1600),
  channel: z.enum(['whatsapp', 'sms', 'telegram']).optional(),
});

// tg:{chatId} was stored on the CitizenRequest at ingest time.
function extractTelegramChatId(phone: string | undefined): string | null {
  if (!phone) return null;
  const m = /^tg:(-?\d+)$/i.exec(phone.trim());
  return m ? m[1] : null;
}

function pickChannel(req: CitizenRequest, override?: NudgeChannel): NudgeChannel {
  if (override) return override;
  if (req.channel === 'telegram' || extractTelegramChatId(req.phone)) return 'telegram';
  if (req.channel === 'sms') return 'sms';
  return 'whatsapp';
}

async function dispatchAndLog(
  req: CitizenRequest,
  statusText: string,
  channel: NudgeChannel,
): Promise<{ nudge: NudgeAlert; dispatch: DispatchResult }> {
  const phone = req.phone ?? '';
  let dispatch: DispatchResult;
  if (channel === 'telegram') {
    const chatId = extractTelegramChatId(phone);
    dispatch = !chatId
      ? ({ dispatched: false, reason: 'no-telegram-chat-id-on-request' } as DispatchResult)
      : await sendTelegramMessage(chatId, statusText);
  } else if (!phone) {
    dispatch = { dispatched: false, reason: 'no-phone-on-request' } as DispatchResult;
  } else if (channel === 'whatsapp') {
    dispatch = await sendWhatsApp(phone, statusText);
  } else {
    dispatch = await sendSMS(phone, statusText);
  }

  const id = docIdFor('nudge');
  const nudge: NudgeAlert = {
    id,
    citizenPhone: phone || 'unknown',
    requestId: req.id,
    channel,
    statusText,
    sentTimestamp: new Date().toISOString(),
    read: false,
  };
  await nudgesCol().doc(id).set(nudge);
  logger.info(
    {
      nudgeId: id,
      requestId: req.id,
      channel,
      dispatched: dispatch.dispatched,
      reason: dispatch.reason,
    },
    'nudge recorded',
  );
  return { nudge, dispatch };
}

export const nudgesRouter = Router();

nudgesRouter.get('/', async (_req, res) => {
  const nudges = await listAll(nudgesCol());
  res.json({ nudges });
});

nudgesRouter.post('/send', requirePolicymaker, async (req, res) => {
  const { requestId, statusText, channel } = SendBodySchema.parse(req.body ?? {});
  const request = await getById(requestsCol(), requestId);
  if (!request) throw new AppError(404, `Request ${requestId} not found`, 'REQUEST_NOT_FOUND');
  const { nudge, dispatch } = await dispatchAndLog(request, statusText, pickChannel(request, channel));
  res.json({ nudge, dispatched: dispatch.dispatched, reason: dispatch.reason });
});

// Exported for use by the projects/sanction handler in the next action.
export async function fireNudge(
  request: CitizenRequest,
  statusText: string,
  channelOverride?: NudgeChannel,
): Promise<NudgeAlert> {
  const { nudge } = await dispatchAndLog(request, statusText, pickChannel(request, channelOverride));
  return nudge;
}
