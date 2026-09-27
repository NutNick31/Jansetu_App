import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

const API_BASE = 'https://api.telegram.org';

export interface TelegramSendResult {
  dispatched: boolean;
  reason?: string;
}

function baseUrl(): string | undefined {
  if (!env.TELEGRAM_BOT_TOKEN) return undefined;
  return `${API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}`;
}

// Telegram errors come back as { ok: false, error_code, description } — surface the description.
function extractTelegramReason(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { description?: string; error_code?: number } | undefined;
    if (data?.description) {
      // Rewrite the most common opaque case so the UI can explain what to do.
      if (/chat not found/i.test(data.description)) {
        return 'Chat not found — the user must open @jansetu_ai_bot and press Start before we can DM them.';
      }
      if (/bot was blocked/i.test(data.description)) {
        return 'The citizen has blocked the JanSetu bot on Telegram.';
      }
      return `Telegram: ${data.description}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

// Sends a text message to a Telegram chat. No-op with reason if token missing.
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<TelegramSendResult> {
  const url = baseUrl();
  if (!url) return { dispatched: false, reason: 'no-credentials' };
  try {
    await axios.post(`${url}/sendMessage`, { chat_id: chatId, text }, { timeout: 8_000 });
    return { dispatched: true };
  } catch (err) {
    const reason = extractTelegramReason(err);
    logger.warn({ chatId, reason }, 'telegram sendMessage failed');
    return { dispatched: false, reason };
  }
}

interface TelegramFile {
  file_id: string;
  file_path?: string;
}

// Downloads a Telegram file attachment (voice notes, photos, docs) as base64 + mime.
export async function downloadTelegramFile(fileId: string): Promise<{ base64: string; contentType: string } | null> {
  const url = baseUrl();
  if (!url) return null;
  try {
    const meta = await axios.get<{ ok: boolean; result: TelegramFile }>(`${url}/getFile`, {
      params: { file_id: fileId },
      timeout: 8_000,
    });
    const filePath = meta.data?.result?.file_path;
    if (!filePath) return null;
    const bin = await axios.get<ArrayBuffer>(
      `${API_BASE}/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`,
      { responseType: 'arraybuffer', maxContentLength: 20 * 1024 * 1024, timeout: 15_000 },
    );
    const contentType = String(bin.headers['content-type'] ?? 'application/octet-stream').split(';')[0].trim();
    return { base64: Buffer.from(bin.data).toString('base64'), contentType };
  } catch (err) {
    logger.warn({ err, fileId }, 'telegram file download failed');
    return null;
  }
}

// Registers our /api/telegram/webhook URL with Telegram. Called by the setup script.
export async function setWebhook(publicUrl: string): Promise<{ ok: boolean; description?: string }> {
  const url = baseUrl();
  if (!url) throw new Error('TELEGRAM_BOT_TOKEN is required');
  const res = await axios.post<{ ok: boolean; description?: string }>(`${url}/setWebhook`, {
    url: publicUrl,
    allowed_updates: ['message'],
  });
  return res.data;
}
