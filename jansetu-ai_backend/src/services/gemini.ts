import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

const TEXT_MODEL = 'gemini-flash-lite-latest';
const MULTIMODAL_MODEL = 'gemini-3.8-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

let client: GoogleGenAI | undefined;

function ai(): GoogleGenAI {
  if (client) return client;
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

type GenerateReq = Parameters<GoogleGenAI['models']['generateContent']>[0];
type GenerateResp = Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;

// Retries only on transient 429/503; caller sees the final error if the model is really down.
async function generate(req: GenerateReq): Promise<GenerateResp> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai().models.generateContent(req);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /got status: (429|503)/.test(msg);
      if (!transient || attempt === maxAttempts) throw err;
      const delayMs = 2000 * 2 ** (attempt - 1);
      logger.warn({ attempt, delayMs, msg }, 'gemini transient error, retrying');
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function extractText(resp: { text?: string | (() => string) }): string {
  const t = resp.text;
  const value = typeof t === 'function' ? t() : t;
  return (value ?? '').trim();
}

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

async function jsonCall<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const resp = await generate({
    model: TEXT_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const raw = stripJsonFence(extractText(resp));
  try {
    return schema.parse(JSON.parse(raw));
  } catch (err) {
    logger.warn({ raw, err }, 'gemini json parse failed');
    throw new Error('Gemini returned invalid JSON');
  }
}

// Generic JSON prompt for callers that build their own schema.
export function runJsonPrompt<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  return jsonCall(prompt, schema);
}

// --- Vision: analyze citizen infrastructure photo ---

export const AiDiagnosticSchema = z.object({
  issueDetected: z.string().min(1),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  category: z.enum([
    'rural_roads',
    'clean_water',
    'healthcare',
    'school_upgrades',
    'power_grid',
    'sanitation_drainage',
  ]),
  estimatedCostCr: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  detailedAssessment: z.string().min(1),
});
export type AiDiagnostic = z.infer<typeof AiDiagnosticSchema>;

export async function analyzePhoto(
  imageBase64: string,
  mimeType: string,
  userDescription: string,
): Promise<AiDiagnostic> {
  const prompt = `You are a senior civil-engineering AI inspector for the JanSetu Digital Public Infrastructure programme in India.
Analyze the photo of citizen-reported infrastructure and produce a structured diagnostic.

Citizen description: "${userDescription}"

Respond ONLY with JSON matching this shape:
{
  "issueDetected": string (short summary of the defect),
  "severity": "Low" | "Medium" | "High" | "Critical",
  "category": "rural_roads" | "clean_water" | "healthcare" | "school_upgrades" | "power_grid" | "sanitation_drainage",
  "estimatedCostCr": number (in Indian Crore, e.g. 2.5),
  "confidence": number between 0 and 1,
  "detailedAssessment": string (2-3 sentences)
}`;

  const resp = await generate({
    model: MULTIMODAL_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });
  const raw = stripJsonFence(extractText(resp));
  try {
    return AiDiagnosticSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.warn({ raw, err }, 'analyzePhoto invalid JSON');
    throw new Error('Gemini returned invalid vision JSON');
  }
}

// --- Copilot: policy Q&A ---

export async function queryCopilot(userQuery: string, contextText: string): Promise<string> {
  const prompt = `You are a NITI Aayog AI policy advisor for JanSetu. Give concise, actionable answers for Indian infrastructure planners.
Context (JSON district metrics + citizen requests):
${contextText}

Question: ${userQuery}

Reply in markdown with 3 short bullet points covering:
1. Top demand hotspot in scope.
2. Recommended central scheme (PMGSY, Jal Jeevan Mission, AB-HIM, etc.) and rough budget in ₹ Cr.
3. Expected beneficiary reach and next planner action.`;

  const resp = await generate({
    model: TEXT_MODEL,
    contents: prompt,
  });
  return extractText(resp);
}

// --- Translation: Indic language → English ---

const TranslationSchema = z.object({
  translated: z.string(),
  detectedLanguage: z.string(),
  confidence: z.number().min(0).max(1),
});
export type Translation = z.infer<typeof TranslationSchema>;

export async function translateToEnglish(text: string, sourceLang?: string): Promise<Translation> {
  const hint = sourceLang ? `The source language is likely "${sourceLang}".` : '';
  const prompt = `Translate the following Indian-language text into natural English. ${hint}
Preserve intent, place names (transliterated), numbers, and infrastructure terms.

Text: """${text}"""

Respond ONLY with JSON:
{
  "translated": string (English translation),
  "detectedLanguage": string (ISO code such as "hi", "ta", "or"; "en" if already English),
  "confidence": number between 0 and 1
}`;
  return jsonCall(prompt, TranslationSchema);
}

// --- ASR: audio bytes → transcript + language + English ---

const AsrResultSchema = z.object({
  transcript: z.string(),
  detectedLanguage: z.string(),
  translationEn: z.string(),
});
export type AsrResult = z.infer<typeof AsrResultSchema>;

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<AsrResult> {
  const prompt = `Transcribe the attached audio, detect the language, and produce an English translation.
Respond ONLY with JSON:
{
  "transcript": string (verbatim in original language / script),
  "detectedLanguage": string (ISO code, e.g. "hi", "ta"),
  "translationEn": string (English translation)
}`;
  const resp = await generate({
    model: MULTIMODAL_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  });
  const raw = stripJsonFence(extractText(resp));
  try {
    return AsrResultSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.warn({ raw, err }, 'transcribeAudio invalid JSON');
    throw new Error('Gemini returned invalid ASR JSON');
  }
}

// --- TTS: text → WAV audio buffer ---

// Gemini TTS returns PCM L16 mono; wrap in a RIFF/WAV header so browsers can play the file directly.
function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function synthesizeSpeech(text: string, voiceName = 'Kore'): Promise<Buffer> {
  const resp = await generate({
    model: TTS_MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });
  const candidates = resp.candidates ?? [];
  const audioPart = candidates[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const base64 = audioPart?.inlineData?.data;
  if (!base64) {
    logger.warn({ resp }, 'TTS returned no audio inlineData');
    throw new Error('Gemini TTS returned no audio');
  }
  return pcmToWav(Buffer.from(base64, 'base64'));
}

// --- Entity extraction: free citizen text → structured 3-point payload ---

const EntitiesSchema = z.object({
  missingInfrastructure: z.string(),
  category: z.enum([
    'rural_roads',
    'clean_water',
    'healthcare',
    'school_upgrades',
    'power_grid',
    'sanitation_drainage',
  ]),
  locationLandmark: z.string(),
  district: z.string().nullable(),
  state: z.string().nullable(),
  affectedPeopleCount: z.number().int().nonnegative(),
  extractedPincode: z.string().nullable(),
});
export type ExtractedEntities = z.infer<typeof EntitiesSchema>;

export async function extractEntities(text: string): Promise<ExtractedEntities> {
  const prompt = `From this citizen complaint (English), extract the three JanSetu data points about missing infrastructure in India.
Text: """${text}"""

Rules:
- If a 6-digit Indian pincode is present, use it to infer the district and state (e.g. 560001 = Bengaluru, Karnataka; 221001 = Varanasi, Uttar Pradesh; 766027 = Kalahandi, Odisha).
- If a well-known Indian locality, landmark, block, or road name is mentioned, infer the parent district / state (e.g. "Sarjapur Road" = Bengaluru Urban, Karnataka; "Lanjigarh" = Kalahandi, Odisha).
- Only return null for district / state if you have no signal at all.

Respond ONLY with JSON:
{
  "missingInfrastructure": string (what is missing / broken),
  "category": "rural_roads" | "clean_water" | "healthcare" | "school_upgrades" | "power_grid" | "sanitation_drainage",
  "locationLandmark": string (landmark, ward, or descriptive location),
  "district": string | null,
  "state": string | null,
  "affectedPeopleCount": integer (0 if unknown),
  "extractedPincode": string | null (6-digit Indian pincode if mentioned)
}`;
  return jsonCall(prompt, EntitiesSchema);
}
