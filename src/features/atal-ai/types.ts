export type AtalAIStatus = 'empty' | 'composing' | 'recording' | 'uploading' | 'processing' | 'needs_information' | 'ready_for_review' | 'saved' | 'error';
export type AtalAIIntent =
  | 'create_patient_plan'
  | 'create_plan_for_existing_patient'
  | 'create_exercise'
  | 'update_patient_record'
  | 'update_existing_plan'
  | 'update_existing_exercise'
  | 'search_patient'
  | 'summarize_patient'
  | 'add_patient_note'
  | 'update_plan_status'
  | 'archive_plan'
  | 'restore_plan'
  | 'replace_active_plan'
  | 'summarize_sessions'
  | 'create_report'
  | 'export_data'
  | 'update_settings';

export type AIWorkContext = {
  intent: AtalAIIntent;
  patientMode: 'new' | 'existing' | 'none';
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
};

export type AICommandType =
  | 'search_patient'
  | 'summarize_patient'
  | 'add_patient_note'
  | 'activate_plan'
  | 'pause_plan'
  | 'complete_plan'
  | 'archive_plan'
  | 'restore_plan'
  | 'replace_active_plan'
  | 'summarize_sessions'
  | 'create_report'
  | 'export_data'
  | 'update_settings';

export type AICommand = {
  type: AICommandType;
  patientId: string;
  planId: string;
  exerciseId: string;
  sessionId: string;
  query: string;
  content: string;
  exportType: 'patients' | 'progress' | 'plans' | 'backup' | '';
  settings: Record<string, boolean | string>;
};

export type AIAttachmentKind = 'image' | 'pdf' | 'audio';

export type AIAttachmentMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: AIAttachmentKind;
  available: boolean;
};

export type AIAttachmentPayload = AIAttachmentMeta & {
  data: string;
};

export type AIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
  attachments: AIAttachmentMeta[];
};

export type AIPatientDraft = {
  name: string;
  age: number | null;
  birthDate: string;
  sex: string;
  reasonForVisit: string;
  affectedArea: string;
  evolutionTime: string;
  providedDiagnosis: string;
  painLevel: number | null;
  symptoms: string[];
  functionalLimitations: string[];
  goals: string[];
  relevantHistory: string[];
  precautions: string[];
  clinicalNotes: string;
};

export type AIPlanDraft = {
  title: string;
  goal: string;
  focus: string;
  duration: { value: number | null; unit: 'days' | 'weeks' | 'months' | 'custom'; customText: string };
  frequency: { value: number | null; period: 'day' | 'week' | 'month' | 'custom'; customText: string };
  phases: string[];
  generalInstructions: string;
  progressCriteria: string;
  status: 'draft' | 'active';
};

export type AIExerciseDraft = {
  id: string;
  sourceExerciseId?: string;
  name: string;
  region: string;
  category: string;
  objective: string;
  startingPosition: string;
  instructions: string[];
  precautions: string[];
  equipment: string;
  difficulty: string;
  sets: number | null;
  repetitions: string;
  duration: string;
  rest: string;
  maxPain: number | null;
  tags: string[];
  notes: string;
  reusePreference: 'reuse-exact' | 'create-new';
};

export type AtalAIDraft = {
  id: string;
  intent: AtalAIIntent;
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
  patient: AIPatientDraft;
  plan: AIPlanDraft;
  exercises: AIExerciseDraft[];
  responseMode: 'draft' | 'query' | 'command';
  assistantMessage: string;
  command: AICommand | null;
  missingFields: string[];
  uncertainFields: string[];
  contradictions: string[];
  followUpQuestion: string;
  proposedActions:string[];
  baseVersions: {
    patientUpdatedAt: string;
    recordUpdatedAt: string;
    planUpdatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PrivateContactDraft = {
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
};

export type AIConversation = {
  id: string;
  draftId: string;
  createdAt: string;
  updatedAt: string;
  status: AtalAIStatus;
  composerText: string;
  transcription: string;
  messages: AIMessage[];
  attachmentMetadata: AIAttachmentMeta[];
  privateContact: PrivateContactDraft;
  workContext:AIWorkContext;
  savedResult?: { patientId?: string; planId?: string; clinicalRecordId?: string; exerciseId?:string; summary:string[]; undo?: AIUndoToken };
  error?: string;
};

export type LegacyAIUndoToken = {
  entity: 'plan' | 'record' | 'settings';
  entityId: string;
  previous: unknown;
  expiresAt: string;
};

export type AIUndoToken = UndoReceipt | LegacyAIUndoToken;

export type AICommandResult = {
  message: string;
  href?: string;
  summary?: string[];
  undo?: AIUndoToken;
  clientEffect?: ClientEffect;
};

export type AtalAIAnalyzeRequest = {
  draftId?: string;
  mode: 'analyze' | 'transcribe' | 'regenerate-plan' | 'regenerate-exercise';
  text: string;
  transcription?: string;
  attachments: AIAttachmentPayload[];
  currentDraft?: AtalAIDraft | null;
  targetExerciseId?: string;
  workContext?:AIWorkContext;
  existingContext?: {
    patient?: { id: string; name: string; diagnosis: string; age: number | null; affectedArea: string };
    clinicalRecord?: { reasonForVisit: string; evolution: string; affectedArea: string; symptoms: string[]; painLevel: number | null; providedDiagnosis: string; functionalLimitations: string[]; goals: string[]; relevantHistory: string[]; precautions: string[]; clinicalNotes: string };
    plan?: { id: string; title: string; focus: string; duration: string; frequency: string; goal: string; exerciseIds: string[]; status: string; progression: string; reportCriteria: string; generalInstructions: string };
    exercise?: { id: string; name: string; region: string; category: string; objective: string; sets: number; repetitions?: number; time?: string; status: string };
  };
};

export type AtalAIAnalyzeResponse = { draft?: AtalAIDraft; transcript?: string };
import type { ClientEffect, UndoReceipt } from './core/contracts';
