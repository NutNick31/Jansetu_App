import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../middleware/logger';
import { ingestCitizenRequest } from '../../services/ingest';

const TwilioSmsSchema = z
  .object({
    MessageSid: z.string().optional(),
    From: z.string().optional(),
    Body: z.string().optional(),
  })
  .passthrough();

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

function twiml(message: string): string {
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export const smsRouter = Router();

smsRouter.post('/twilio', async (req, res) => {
  const payload = TwilioSmsSchema.parse(req.body ?? {});
  const sid = payload.MessageSid ?? `sid_${Date.now()}`;
  if (!rememberSid(sid)) {
    res.type('text/xml').send(twiml('Already received, thank you.'));
    return;
  }

  const body = payload.Body?.trim();
  if (!body) {
    res.type('text/xml').send(twiml('Please text a short description of the infrastructure issue.'));
    return;
  }

  try {
    const created = await ingestCitizenRequest({
      channel: 'sms',
      phone: payload.From,
      rawText: body,
    });
    res.type('text/xml').send(
      twiml(`Received. Category: ${created.category.replace('_', ' ')}. District: ${created.district}. ID #${created.id}.`),
    );
  } catch (err) {
    logger.error({ err, sid }, 'twilio sms ingest failed');
    res.type('text/xml').send(twiml('Sorry, something went wrong. Please try again shortly.'));
  }
});
