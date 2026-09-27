import twilio, { type Twilio } from 'twilio';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

export interface DispatchResult {
  dispatched: boolean;
  sid?: string;
  reason?: string;
}

let client: Twilio | undefined;

function getClient(): Twilio | undefined {
  if (client) return client;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return undefined;
  client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return client;
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').replace(/^whatsapp:/i, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/[^\d]/g, '')}`;
}

async function dispatch(from: string, to: string, body: string): Promise<DispatchResult> {
  const c = getClient();
  if (!c) return { dispatched: false, reason: 'no-credentials' };
  try {
    const msg = await c.messages.create({ from, to, body });
    return { dispatched: true, sid: msg.sid };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn({ from, to, reason }, 'twilio dispatch failed');
    return { dispatched: false, reason };
  }
}

export async function sendWhatsApp(rawPhone: string, body: string): Promise<DispatchResult> {
  if (!env.TWILIO_WHATSAPP_FROM) return { dispatched: false, reason: 'no-whatsapp-from' };
  const to = `whatsapp:${normalizePhone(rawPhone)}`;
  return dispatch(env.TWILIO_WHATSAPP_FROM, to, body);
}

export async function sendSMS(rawPhone: string, body: string): Promise<DispatchResult> {
  if (!env.TWILIO_SMS_FROM) return { dispatched: false, reason: 'no-sms-from' };
  return dispatch(env.TWILIO_SMS_FROM, normalizePhone(rawPhone), body);
}
