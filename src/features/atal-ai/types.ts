export type AtalAIStatus = 'empty' | 'composing' | 'recording' | 'uploading' | 'processing' | 'needs_information' | 'ready_for_review' | 'saved' | 'error';

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
  status: 'draft' | 'active';
};

export type AIExerciseDraft = {
  id: string;
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
  intent: 'create_patient_plan';
  patient: AIPatientDraft;
  plan: AIPlanDraft;
  exercises: AIExerciseDraft[];
  missingFields: string[];
  uncertainFields: string[];
  contradictions: string[];
  followUpQuestion: string;
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
  savedResult?: { patientId: string; planId: string; clinicalRecordId: string };
  error?: string;
};

export type AtalAIAnalyzeRequest = {
  mode: 'analyze' | 'transcribe' | 'regenerate-plan' | 'regenerate-exercise';
  text: string;
  transcription?: string;
  attachments: AIAttachmentPayload[];
  currentDraft?: AtalAIDraft | null;
  targetExerciseId?: string;
};

export type AtalAIAnalyzeResponse = { draft?: AtalAIDraft; transcript?: string };
