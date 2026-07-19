export type AtalAIStatus = 'empty' | 'composing' | 'recording' | 'uploading' | 'processing' | 'needs_information' | 'ready_for_review' | 'saved' | 'error';
export type AtalAIIntent='create_patient_plan'|'create_plan_for_existing_patient'|'create_exercise'|'update_patient_record'|'update_existing_plan';
export type AIWorkContext={intent:AtalAIIntent;patientMode:'new'|'existing'|'none';selectedPatientId:string;selectedPlanId:string};

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
  intent: AtalAIIntent;
  selectedPatientId: string;
  selectedPlanId: string;
  patient: AIPatientDraft;
  plan: AIPlanDraft;
  exercises: AIExerciseDraft[];
  missingFields: string[];
  uncertainFields: string[];
  contradictions: string[];
  followUpQuestion: string;
  proposedActions:string[];
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
  savedResult?: { patientId?: string; planId?: string; clinicalRecordId?: string; exerciseId?:string; summary:string[] };
  error?: string;
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
  };
};

export type AtalAIAnalyzeResponse = { draft?: AtalAIDraft; transcript?: string };
