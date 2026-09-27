// Mirror of jansetu-ai_frontend/src/types/index.ts. Kept in sync until a shared package is extracted.

export type LanguageCode = 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'kn' | 'gu' | 'ml' | 'or' | 'pa' | 'en';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: string;
}

export type InfrastructureCategory =
  | 'rural_roads'
  | 'clean_water'
  | 'healthcare'
  | 'school_upgrades'
  | 'power_grid'
  | 'sanitation_drainage';

export interface CitizenRequest {
  id: string;
  channel: 'whatsapp' | 'ivr' | 'sms' | 'webapp' | 'ussd' | 'telegram';
  language: LanguageCode;
  citizenName?: string;
  phone?: string;
  text: string;
  voiceTranscript?: string;
  category: InfrastructureCategory;
  district: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  landmark?: string;
  affectedPeople: number;
  urgencyScore: number;
  status: 'submitted' | 'ai_verified' | 'matched_to_scheme' | 'sanctioned' | 'under_construction' | 'completed';
  timestamp: string;
  evidenceImageUrl?: string;
  aiDiagnostic?: {
    issueDetected: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    estimatedCostCr: number;
    confidence: number;
  };
  h3HexId: string;
  matchedScheme?: string;
}

export interface DistrictMetric {
  districtId: string;
  districtName: string;
  state: string;
  lat: number;
  lng: number;
  h3Index: string;
  h3HexCoordinates: Array<[number, number]>;
  populationDensity: number;
  vulnerabilityIndex: number;
  roadDeficitIndex: number;
  waterDeficitIndex: number;
  healthDeficitIndex: number;
  schoolDeficitIndex: number;
  powerDeficitIndex: number;
  aspirationalDistrict: boolean;
  unspentPFMSFundsCr: number;
  gatiShaktiBaseline: {
    existingRoadKm: number;
    waterPipelineCoveragePct: number;
    primaryHealthCentres: number;
    electrifiedSchoolsPct: number;
  };
  citizenDemandCount: number;
  priorityIndex: number;
  wikipediaSummary?: string;
  wikipediaUrl?: string;
  censusPopulation?: number;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  acronym: string;
  ministry: string;
  category: InfrastructureCategory;
  totalBudgetCr: number;
  unallocatedBudgetCr: number;
  costPerBeneficiaryCap: number;
  description: string;
  iconName: string;
  wikipediaSummary?: string;
  wikipediaUrl?: string;
}

export interface NudgeAlert {
  id: string;
  citizenPhone: string;
  requestId: string;
  channel: 'whatsapp' | 'sms' | 'telegram';
  statusText: string;
  sentTimestamp: string;
  read: boolean;
}

export interface RecommendedProject {
  id: string;
  title: string;
  district: string;
  state: string;
  category: InfrastructureCategory;
  affectedVillages: number;
  affectedPopulation: number;
  estimatedBudgetCr: number;
  matchedScheme: string;
  matchedSchemeAcronym: string;
  priorityScore: number;
  h3ClusterId: string;
  status: 'recommended' | 'sanctioned' | 'in_progress' | 'audited';
  justification?: string;
  satelliteAudit?: {
    preImageUrl: string;
    postImageUrl: string;
    verificationScore: number;
    completionDate: string;
  };
}
