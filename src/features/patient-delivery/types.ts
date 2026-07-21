import type { ExerciseMediaRef, PlanStatus } from '@/src/data/atalStore';

export const PATIENT_PLAN_DOCUMENT_VERSION = 1 as const;

export type PatientPlanDeliveryEligibility = {
  allowed: boolean;
  requiresConfirmation: boolean;
  state: 'ready' | 'warning' | 'blocked';
  reason: string;
  missingExerciseIds: string[];
};

export type PatientPlanDocumentExercise = {
  id: string;
  order: number;
  name: string;
  region: string;
  category: string;
  objective: string;
  startingPosition: string;
  instructions: string[];
  precautions: string;
  equipment: string;
  sets: number;
  repetitions?: number;
  duration?: string;
  rest: string;
  maxPain: number | null;
  therapistNotes: string;
  doseLabel: string;
  media: ExerciseMediaRef;
};

export type PatientPlanDocument = {
  version: typeof PATIENT_PLAN_DOCUMENT_VERSION;
  generatedAt: string;
  patient: {
    id: string;
    name: string;
    diagnosis: string;
    affectedArea: string;
  };
  professional: {
    name: string;
    specialty: string;
    clinic: string;
  };
  plan: {
    id: string;
    title: string;
    status: PlanStatus;
    focus: string;
    objective: string;
    duration: string;
    frequency: string;
    progression: string;
    reportCriteria: string;
    generalInstructions: string;
    updatedAt: string;
  };
  exercises: PatientPlanDocumentExercise[];
  delivery: {
    generatedLocally: true;
    publicLinkCreated: false;
    addressedDocument: true;
  };
};

export type PatientPlanDocumentMode = 'simple' | 'session-log' | 'detailed';
export type PatientPlanFontScale = 'large' | 'extra-large';

export type PatientPlanLogFields = {
  date: boolean;
  overallCompletion: boolean;
  perExerciseCompletion: boolean;
  painBefore: boolean;
  painAfter: boolean;
  difficulty: boolean;
  notes: boolean;
};

export type PatientPlanDeliveryOptions = {
  mode: PatientPlanDocumentMode;
  fontScale: PatientPlanFontScale;
  includeExercises: boolean;
  includeRest: boolean;
  includeImages: boolean;
  sessionCount: number;
  logFields: PatientPlanLogFields;
};

export type PatientPlanPageEstimate = {
  pageCount: number;
  exerciseRowsPerPage: number;
  sessionsPerFirstPage: number;
  sessionsPerContinuationPage: number;
  summary: string;
};

export type PatientPlanResolvedMedia = {
  exerciseId: string;
  jpegBytes?: Uint8Array;
  width?: number;
  height?: number;
  omittedReason?: string;
};

export type PatientPlanPdfResult = {
  bytes: Uint8Array;
  filename: string;
  mimeType: 'application/pdf';
  pageCount: number;
  omittedMedia: string[];
};

export type SharePatientPlanResult =
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'downloaded'; reason: 'unsupported' | 'failed' };
