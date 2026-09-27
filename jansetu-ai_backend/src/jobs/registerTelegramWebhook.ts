import { env } from '../config/env';
import { logger } from '../middleware/logger';
import { setWebhook } from '../services/telegramSender';

async function main(): Promise<void> {
  const publicUrl = process.argv[2];
  if (!publicUrl) {
    console.error('Usage: tsx src/jobs/registerTelegramWebhook.ts <public-tunnel-url>');
    console.error('Example: tsx src/jobs/registerTelegramWebhook.ts https://tales-enclosure-normal-planners.trycloudflare.com');
    process.exit(1);
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set in .env');
    process.exit(1);
  }
  const url = `${publicUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  logger.info({ url }, 'registering Telegram webhook');
  const result = await setWebhook(url);
  logger.info(result, 'Telegram setWebhook result');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, 'failed to register webhook');
    process.exit(1);
  });
