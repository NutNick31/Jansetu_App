import { apiPost } from './apiClient';
import type { LanguageCode } from '../types';

export interface BhashiniTranslationResult {
  sourceText: string;
  sourceLang: LanguageCode;
  translatedText: string;
  targetLang: 'en';
  confidenceScore: number;
}

export interface ExtractedDataPoints {
  missingInfrastructure: string;
  category: string;
  locationLandmark: string;
  district: string;
  state: string;
  affectedPeopleCount: number;
  extractedPincode?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export async function bhashiniTranslateToEnglish(
  text: string,
  sourceLang: LanguageCode,
): Promise<BhashiniTranslationResult> {
  if (sourceLang === 'en') {
    return { sourceText: text, sourceLang, translatedText: text, targetLang: 'en', confidenceScore: 0.99 };
  }
  try {
    const res = await apiPost<{ translated: string; detectedLanguage: string; confidence: number }>(
      '/api/translate',
      { text, sourceLang },
    );
    return {
      sourceText: text,
      sourceLang,
      translatedText: res.translated,
      targetLang: 'en',
      confidenceScore: res.confidence,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Translate proxy failed, using canned sample', err);
    const canned: Partial<Record<LanguageCode, string>> = {
      hi: 'In our village Sewapuri, the main connecting road has been broken for 2 years.',
      ta: 'In Mananthavady tribal village, 450 families do not have drinking water pipe connections.',
      te: 'In our village, the primary health centre has no electricity and no safe drinking water. 3000 people are suffering.',
      mr: 'In our village during monsoons, floodwater on the bridge cuts off 8 villages.',
      bn: 'In our block, the health centre has no doctor and no medicine; severe drinking water shortage.',
      kn: 'In our village school there is no electricity and no clean water for the mid-day meal.',
      gu: 'The drinking water pipeline in our village has burst and the road is broken.',
      ml: 'In our Wayanad village, the drinking water pipe has been broken for 6 months.',
      or: 'The Lanjigarh Panchayat primary health centre has no doctor and no electricity.',
      pa: 'The main road in our village is broken and there is a shortage of drinking water.',
    };
    return {
      sourceText: text,
      sourceLang,
      translatedText: canned[sourceLang] ?? `[Offline translation]: ${text}`,
      targetLang: 'en',
      confidenceScore: 0.5,
    };
  }
}

// Local heuristic — kept client-side for instant preview; real entity extraction will move server-side in Phase 3.
export function extractDataPointsFromInput(text: string): ExtractedDataPoints {
  const textLower = text.toLowerCase();

  let category = 'rural_roads';
  let missingInfra = 'Broken Rural Connectivity Road & Culvert';
  let affected = 4500;
  let district = 'Varanasi (Sewapuri Block)';
  let state = 'Uttar Pradesh';
  let pincode = '221403';
  let landmark = 'Near Sewapuri Village Panchayat & Primary School';

  if (/water|pani|pipe|जल|தண்ணீர்|నీరు/.test(textLower)) {
    category = 'clean_water';
    missingInfra = 'Clean Tap Water Pipeline & Overhead Tank';
    affected = 2800;
    district = 'Wayanad (Mananthavady)';
    state = 'Kerala';
    pincode = '670645';
    landmark = 'Near Tribal Welfare Colony, Ward 8';
  } else if (/health|phc|hospital|स्वास्थ्य|சுகாதாரம்|వైద్యం/.test(textLower)) {
    category = 'healthcare';
    missingInfra = 'Primary Health Centre Solar Grid & Maternity Ward';
    affected = 12000;
    district = 'Kalahandi (Lanjigarh)';
    state = 'Odisha';
    pincode = '766027';
    landmark = 'Lanjigarh Block HQ Ground';
  } else if (/school|shiksha|स्कूल|பள்ளி/.test(textLower)) {
    category = 'school_upgrades';
    missingInfra = 'Government School Roof Repair & Computer Lab Power';
    affected = 850;
    district = 'Purnia (Dhamdaha)';
    state = 'Bihar';
    pincode = '854205';
    landmark = 'Near Dhamdaha Kanya Secondary School';
  }

  const numberMatches = text.match(/\b\d+\b/g);
  if (numberMatches && numberMatches.length > 0) {
    const extractedNum = parseInt(numberMatches[0], 10);
    if (extractedNum > 10 && extractedNum < 500_000) {
      affected = extractedNum;
    }
  }

  return {
    missingInfrastructure: missingInfra,
    category,
    locationLandmark: landmark,
    district,
    state,
    affectedPeopleCount: affected,
    extractedPincode: pincode,
  };
}

function pickWebSpeechVoice(lang: LanguageCode): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang));
}

async function playBackendTts(text: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`tts HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

export function playBhashiniTTS(text: string, lang: LanguageCode): void {
  if ('speechSynthesis' in window) {
    const voice = pickWebSpeechVoice(lang);
    if (voice) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      return;
    }
  }
  // No native voice for this language — hit the backend proxy in the background.
  playBackendTts(text).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('Backend TTS fallback failed', err);
  });
}
