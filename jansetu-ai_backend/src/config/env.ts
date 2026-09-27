import 'dotenv/config';
import { z } from 'zod';

// Fails fast at startup if any required Tier 1 credential is missing. Updated 2026-09-27.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),

  // Tier 1 — required
  GEMINI_API_KEY: z.string().min(10, 'GEMINI_API_KEY is required'),
  FIREBASE_PROJECT_ID: z.string().min(3, 'FIREBASE_PROJECT_ID is required'),
  // On Cloud Run, leave this unset — the runtime service account provides ADC automatically.
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  // On Render.com or any container without a mounted file: paste the whole service-account JSON here (base64-encoded).
  FIREBASE_SERVICE_ACCOUNT_B64: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),

  // Tier 2 — optional (multichannel demo)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),

  // Comma-separated list of emails that get the 'policymaker' role after Firebase Auth sign-in.
  POLICYMAKER_EMAILS: z.string().optional(),

  // Tier 3 — deferred
  META_VERIFY_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  EE_SERVICE_ACCOUNT: z.string().optional(),
  GCS_BUCKET: z.string().optional(),
  BQ_DATASET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
