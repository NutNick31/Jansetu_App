import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../middleware/logger';
import { ingestCitizenRequest } from '../../services/ingest';

const IvrEntrySchema = z
  .object({
    CallSid: z.string().optional(),
    From: z.string().optional(),
  })
  .passthrough();

const IvrGatherSchema = z
  .object({
    CallSid: z.string().optional(),
    From: z.string().optional(),
    SpeechResult: z.string().optional(),
    Confidence: z.string().optional(),
    Language: z.string().optional(),
  })
  .passthrough();

const processedCallSids = new Set<string>();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PROMPT =
  'Namaste, and welcome to JanSetu AI. After the beep, please describe your infrastructure issue in Hindi or English. Say what is broken, where it is, and how many people are affected.';

function entryTwiml(gatherAction: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(PROMPT)}</Say>
  <Gather input="speech" language="hi-IN" speechModel="phone_call" speechTimeout="auto" action="${gatherAction}" method="POST"/>
  <Say voice="Polly.Aditi" language="hi-IN">Sorry, we did not receive your response. Goodbye.</Say>
</Response>`;
}

function confirmTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

export const ivrRouter = Router();

ivrRouter.post('/voice', (req, res) => {
  IvrEntrySchema.parse(req.body ?? {});
  res.type('text/xml').send(entryTwiml('/api/ivr/gather'));
});

ivrRouter.post('/gather', async (req, res) => {
  const payload = IvrGatherSchema.parse(req.body ?? {});
  const callSid = payload.CallSid ?? `call_${Date.now()}`;
  if (processedCallSids.has(callSid)) {
    res.type('text/xml').send(confirmTwiml('Already received. Thank you.'));
    return;
  }
  processedCallSids.add(callSid);

  const speech = payload.SpeechResult?.trim();
  if (!speech) {
    res.type('text/xml').send(confirmTwiml('We did not catch that. Please call again and speak after the beep.'));
    return;
  }

  try {
    const created = await ingestCitizenRequest({
      channel: 'ivr',
      phone: payload.From,
      rawText: speech,
      transcript: speech,
      detectedLangHint: payload.Language,
    });
    res
      .type('text/xml')
      .send(
        confirmTwiml(
          `Thank you. Your ${created.category.replace('_', ' ')} request for ${created.district} has been recorded. Your reference ID is ${created.id}. Goodbye.`,
        ),
      );
  } catch (err) {
    logger.error({ err, callSid }, 'ivr gather ingest failed');
    res.type('text/xml').send(confirmTwiml('Sorry, we could not process your request. Please try again shortly.'));
  }
});
