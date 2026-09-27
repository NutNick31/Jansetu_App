import { z } from 'zod';
import type {
  CitizenRequest,
  DistrictMetric,
  GovernmentScheme,
  NudgeAlert,
  RecommendedProject,
} from './domain';

export const LanguageCodeSchema = z.enum(['hi', 'ta', 'te', 'mr', 'bn', 'kn', 'gu', 'ml', 'or', 'pa', 'en']);

export const InfrastructureCategorySchema = z.enum([
  'rural_roads',
  'clean_water',
  'healthcare',
  'school_upgrades',
  'power_grid',
  'sanitation_drainage',
]);

export const RequestStatusSchema = z.enum([
  'submitted',
  'ai_verified',
  'matched_to_scheme',
  'sanctioned',
  'under_construction',
  'completed',
]);

export const ChannelSchema = z.enum(['whatsapp', 'ivr', 'sms', 'webapp', 'ussd', 'telegram']);

const AiDiagnosticSchema = z.object({
  issueDetected: z.string(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  estimatedCostCr: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const CitizenRequestSchema = z.object({
  id: z.string().min(1),
  channel: ChannelSchema,
  language: LanguageCodeSchema,
  citizenName: z.string().optional(),
  phone: z.string().optional(),
  text: z.string().min(1),
  voiceTranscript: z.string().optional(),
  category: InfrastructureCategorySchema,
  district: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  landmark: z.string().optional(),
  affectedPeople: z.number().int().nonnegative(),
  urgencyScore: z.number().min(1).max(10),
  status: RequestStatusSchema,
  timestamp: z.string().min(1),
  evidenceImageUrl: z.string().url().optional(),
  aiDiagnostic: AiDiagnosticSchema.optional(),
  h3HexId: z.string().min(1),
  matchedScheme: z.string().optional(),
});

// Fields the backend fills in during ingestion; client provides the rest.
export const CitizenRequestInputSchema = CitizenRequestSchema.omit({
  id: true,
  timestamp: true,
  status: true,
  h3HexId: true,
  aiDiagnostic: true,
  matchedScheme: true,
}).extend({
  status: RequestStatusSchema.optional(),
  timestamp: z.string().optional(),
});

const GatiShaktiBaselineSchema = z.object({
  existingRoadKm: z.number().nonnegative(),
  waterPipelineCoveragePct: z.number().min(0).max(100),
  primaryHealthCentres: z.number().int().nonnegative(),
  electrifiedSchoolsPct: z.number().min(0).max(100),
});

export const DistrictMetricSchema = z.object({
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  state: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  h3Index: z.string().min(1),
  h3HexCoordinates: z.array(z.tuple([z.number(), z.number()])),
  populationDensity: z.number().nonnegative(),
  vulnerabilityIndex: z.number().min(0).max(1),
  roadDeficitIndex: z.number().min(0).max(100),
  waterDeficitIndex: z.number().min(0).max(100),
  healthDeficitIndex: z.number().min(0).max(100),
  schoolDeficitIndex: z.number().min(0).max(100),
  powerDeficitIndex: z.number().min(0).max(100),
  aspirationalDistrict: z.boolean(),
  unspentPFMSFundsCr: z.number().nonnegative(),
  gatiShaktiBaseline: GatiShaktiBaselineSchema,
  citizenDemandCount: z.number().int().nonnegative(),
  priorityIndex: z.number(),
  wikipediaSummary: z.string().optional(),
  wikipediaUrl: z.string().optional(),
  censusPopulation: z.number().int().nonnegative().optional(),
});

export const GovernmentSchemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  acronym: z.string().min(1),
  ministry: z.string().min(1),
  category: InfrastructureCategorySchema,
  totalBudgetCr: z.number().nonnegative(),
  unallocatedBudgetCr: z.number().nonnegative(),
  costPerBeneficiaryCap: z.number().nonnegative(),
  description: z.string().min(1),
  iconName: z.string().min(1),
  wikipediaSummary: z.string().optional(),
  wikipediaUrl: z.string().optional(),
});

export const NudgeAlertSchema = z.object({
  id: z.string().min(1),
  citizenPhone: z.string().min(1),
  requestId: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'telegram']),
  statusText: z.string().min(1),
  sentTimestamp: z.string().min(1),
  read: z.boolean(),
});

const SatelliteAuditSchema = z.object({
  preImageUrl: z.string().url(),
  postImageUrl: z.string().url(),
  verificationScore: z.number().min(0).max(1),
  completionDate: z.string().min(1),
});

export const RecommendedProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  district: z.string().min(1),
  state: z.string().min(1),
  category: InfrastructureCategorySchema,
  affectedVillages: z.number().int().nonnegative(),
  affectedPopulation: z.number().int().nonnegative(),
  estimatedBudgetCr: z.number().nonnegative(),
  matchedScheme: z.string().min(1),
  matchedSchemeAcronym: z.string().min(1),
  priorityScore: z.number(),
  h3ClusterId: z.string().min(1),
  status: z.enum(['recommended', 'sanctioned', 'in_progress', 'audited']),
  justification: z.string().optional(),
  satelliteAudit: SatelliteAuditSchema.optional(),
});

// Compile-time guard: schema output must match the hand-written interface.
type _AssertCitizenRequest = z.infer<typeof CitizenRequestSchema> extends CitizenRequest ? true : never;
type _AssertDistrictMetric = z.infer<typeof DistrictMetricSchema> extends DistrictMetric ? true : never;
type _AssertGovernmentScheme = z.infer<typeof GovernmentSchemeSchema> extends GovernmentScheme ? true : never;
type _AssertNudgeAlert = z.infer<typeof NudgeAlertSchema> extends NudgeAlert ? true : never;
type _AssertRecommendedProject = z.infer<typeof RecommendedProjectSchema> extends RecommendedProject ? true : never;

// Consume the aliases so `noUnusedLocals` stays happy.
export type SchemaAsserts = [
  _AssertCitizenRequest,
  _AssertDistrictMetric,
  _AssertGovernmentScheme,
  _AssertNudgeAlert,
  _AssertRecommendedProject,
];
