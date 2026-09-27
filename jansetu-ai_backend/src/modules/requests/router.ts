import { Router } from 'express';
import { latLngToCell } from 'h3-js';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import { logger } from '../../middleware/logger';
import { docIdFor, getById, listAll, requestsCol } from '../../services/firestore';
import { ingestCitizenRequest } from '../../services/ingest';
import { tickDistrictDemand } from '../../services/priority';
import { CitizenRequestInputSchema, LanguageCodeSchema } from '../../types/schemas';
import type { CitizenRequest } from '../../types/domain';

const H3_RESOLUTION = 8;

const IngestInputSchema = z.object({
  text: z.string().min(3).max(4000),
  language: LanguageCodeSchema.optional(),
  citizenName: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  evidenceImageUrl: z.string().url().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  channel: z.enum(['webapp', 'whatsapp', 'ussd']).optional().default('webapp'),
});

export const requestsRouter = Router();

requestsRouter.get('/', async (_req, res) => {
  const requests = await listAll(requestsCol());
  res.json({ requests });
});

requestsRouter.post('/ingest', async (req, res) => {
  const input = IngestInputSchema.parse(req.body ?? {});
  const created = await ingestCitizenRequest({
    channel: input.channel,
    language: input.language,
    citizenName: input.citizenName,
    phone: input.phone,
    rawText: input.text,
    lat: input.lat,
    lng: input.lng,
    evidenceImageUrl: input.evidenceImageUrl,
  });
  res.status(201).json({ request: created });
});

requestsRouter.get('/:id', async (req, res) => {
  const found = await getById(requestsCol(), req.params.id);
  if (!found) throw new AppError(404, `Request ${req.params.id} not found`, 'REQUEST_NOT_FOUND');
  res.json({ request: found });
});

requestsRouter.post('/', async (req, res) => {
  const input = CitizenRequestInputSchema.parse(req.body);
  const id = docIdFor('req');
  const entity: CitizenRequest = {
    ...input,
    id,
    timestamp: input.timestamp ?? new Date().toISOString(),
    status: input.status ?? 'submitted',
    h3HexId: latLngToCell(input.lat, input.lng, H3_RESOLUTION),
  };
  await requestsCol().doc(id).set(entity);
  try {
    await tickDistrictDemand(entity.district, entity.state);
  } catch (err) {
    logger.warn({ err, district: entity.district, id }, 'tickDistrictDemand failed post-save');
  }
  res.status(201).json({ request: entity });
});
