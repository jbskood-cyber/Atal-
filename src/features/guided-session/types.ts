export type Symptom = 'dolor' | 'hormigueo' | 'adormecimiento' | 'inflamación' | 'mareo' | 'otro' | 'ninguno';
export type ExerciseResult = 'completed' | 'partial' | 'skipped';
export type SessionStatus = 'in_progress' | 'partial' | 'completed';

export type GuidedExercise = {
  id: string;
  name: string;
  region: string;
  objective: string;
  sets: number;
  repetitions?: number;
  seconds?: number;
  restSeconds: number;
  maxPain: number;
  equipment: string;
  startingPosition: string;
  instructions: string[];
  precautions: string;
  therapistCue: string;
  media: { type: 'video' | 'animation' | 'sequence' | 'image' | 'none'; url?: string };
};

export type SetRecord = { completed: boolean; repetitions?: number; seconds?: number };
export type DiscomfortReport = { pain: number; effort: number; fatigue: number; symptoms: Symptom[]; comment: string };
export type ExerciseRecord = { result?: ExerciseResult; sets: SetRecord[]; discomfort?: DiscomfortReport };

export type GuidedSessionDraft = {
  version: 1;
  patientId: string;
  status: SessionStatus;
  stage: 'prepare' | 'exercise' | 'close' | 'summary';
  currentExerciseIndex: number;
  startedAt?: string;
  completedAt?: string;
  start: { pain: number; energy: number; comment: string };
  exercises: Record<string, ExerciseRecord>;
  end: { pain: number; energy: number; effort: number; symptoms: Symptom[]; comment: string; easiest: string; hardest: string; discomfort: string };
};

export type GuidedPlan = {
  id: string;
  name: string;
  therapistMessage: string;
  estimatedDuration: string;
  generalInstructions: string;
  exercises: GuidedExercise[];
};
