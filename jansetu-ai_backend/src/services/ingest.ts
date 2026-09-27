import { latLngToCell } from 'h3-js';
import { logger } from '../middleware/logger';
import type { CitizenRequest, DistrictMetric, LanguageCode } from '../types/domain';
import { matchDistrictByName } from './districts';
import { docIdFor, listAll, requestsCol } from './firestore';
import { districtsCol } from './firestore';
import { extractEntities, translateToEnglish, type ExtractedEntities } from './gemini';
import { lookupPincode } from './pincodeLookup';
import { tickDistrictDemand } from './priority';

const H3_RES = 8;

// Ingested-from-anywhere payload; some fields depend on the source channel.
export interface IngestInput {
  channel: CitizenRequest['channel'];
  language?: LanguageCode;
  citizenName?: string;
  phone?: string;
  rawText?: string;
  transcript?: string;
  detectedLangHint?: string;
  lat?: number;
  lng?: number;
  evidenceImageUrl?: string;
}

interface ResolvedLocation {
  district: string;
  state: string;
  lat: number;
  lng: number;
  pincode: string;
  landmark: string;
}

// Default anchor when we cannot match either coords or a district name.
const DEFAULT_LOCATION: ResolvedLocation = {
  district: 'Unknown District',
  state: 'India',
  lat: 23.5,
  lng: 78.9,
  pincode: '000000',
  landmark: 'Location not resolved',
};

async function resolveLocation(
  entities: ExtractedEntities,
  lat: number | undefined,
  lng: number | undefined,
): Promise<ResolvedLocation> {
  const all: DistrictMetric[] = await listAll(districtsCol());

  // 1. Authoritative pincode lookup via India Post beats any Gemini guess.
  const pin = entities.extractedPincode ? await lookupPincode(entities.extractedPincode) : null;

  // 2. Prefer the pincode-derived district, then Gemini's, then None.
  const districtName = pin?.district ?? entities.district ?? null;
  const stateName = pin?.state ?? entities.state ?? null;

  // 3. Match against our seeded districts for lat/lng (so real coords line up with the map).
  const matched = matchDistrictByName(all, districtName);

  const finalLat = lat ?? matched?.lat ?? DEFAULT_LOCATION.lat;
  const finalLng = lng ?? matched?.lng ?? DEFAULT_LOCATION.lng;

  return {
    district: matched?.districtName ?? districtName ?? DEFAULT_LOCATION.district,
    state: matched?.state ?? stateName ?? DEFAULT_LOCATION.state,
    lat: finalLat,
    lng: finalLng,
    pincode: pin?.pincode ?? entities.extractedPincode ?? DEFAULT_LOCATION.pincode,
    landmark:
      entities.locationLandmark ||
      pin?.postOffice ||
      matched?.districtName ||
      DEFAULT_LOCATION.landmark,
  };
}

function inferUrgency(entities: ExtractedEntities): number {
  if (entities.affectedPeopleCount > 10_000) return 10;
  if (entities.affectedPeopleCount > 2_000) return 9;
  if (entities.affectedPeopleCount > 500) return 8;
  return 7;
}

function guessLanguage(input: IngestInput, detected: string): LanguageCode {
  const raw = (input.language ?? input.detectedLangHint ?? detected ?? 'en').toLowerCase();
  const allowed: LanguageCode[] = ['hi', 'ta', 'te', 'mr', 'bn', 'kn', 'gu', 'ml', 'or', 'pa', 'en'];
  return (allowed as string[]).includes(raw) ? (raw as LanguageCode) : 'en';
}

export async function ingestCitizenRequest(input: IngestInput): Promise<CitizenRequest> {
  const source = (input.rawText ?? input.transcript ?? '').trim();
  if (!source) throw new Error('ingest: rawText or transcript is required');

  const alreadyEnglish = (input.language ?? input.detectedLangHint) === 'en';
  const translation = alreadyEnglish
    ? { translated: source, detectedLanguage: 'en', confidence: 0.99 }
    : await translateToEnglish(source, input.language ?? input.detectedLangHint);

  const entities = await extractEntities(translation.translated);
  const location = await resolveLocation(entities, input.lat, input.lng);
  const language = guessLanguage(input, translation.detectedLanguage);
  const h3HexId = latLngToCell(location.lat, location.lng, H3_RES);

  const id = docIdFor(`req_${input.channel}`);
  const entity: CitizenRequest = {
    id,
    channel: input.channel,
    language,
    citizenName: input.citizenName,
    phone: input.phone,
    text: source,
    voiceTranscript: input.transcript,
    category: entities.category,
    district: location.district,
    state: location.state,
    pincode: location.pincode,
    lat: location.lat,
    lng: location.lng,
    landmark: location.landmark,
    affectedPeople: entities.affectedPeopleCount || 500,
    urgencyScore: inferUrgency(entities),
    status: 'ai_verified',
    timestamp: new Date().toISOString(),
    evidenceImageUrl: input.evidenceImageUrl,
    h3HexId,
  };

  await requestsCol().doc(id).set(entity);
  try {
    await tickDistrictDemand(entity.district, entity.state);
  } catch (err) {
    logger.warn({ err, district: entity.district, id }, 'tickDistrictDemand failed post-save');
  }
  logger.info(
    {
      id,
      channel: input.channel,
      district: entity.district,
      category: entity.category,
      affected: entity.affectedPeople,
      detectedLanguage: translation.detectedLanguage,
    },
    'ingested citizen request',
  );
  return entity;
}
