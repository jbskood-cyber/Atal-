import { exercises, type Exercise } from './atal-demo';

export const LOCAL_EXERCISES_KEY = 'atal:local-exercises:v1';

export type ExerciseMedia = {
  type: 'image' | 'video' | 'animation' | 'sequence' | 'none';
  url?: string;
};

export type LocalExercise = {
  id: string;
  name: string;
  region: string;
  category: string;
  objective: string;
  startingPosition: string;
  instructions: string[];
  precautions: string;
  equipment: string;
  difficulty: string;
  sets: number;
  repetitions?: number;
  time?: string;
  rest: string;
  maxPain: number;
  tags: string[];
  notes: string;
  media: ExerciseMedia;
  createdAt: string;
  updatedAt: string;
};

export type NewLocalExercise = Omit<LocalExercise, 'id' | 'createdAt' | 'updatedAt'>;

export type ExerciseCatalogItem = Exercise & {
  source: 'demo' | 'local';
  details?: LocalExercise;
};

function isLocalExercise(value: unknown): value is LocalExercise {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LocalExercise>;
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.region === 'string'
    && typeof item.category === 'string'
    && Array.isArray(item.instructions)
    && typeof item.sets === 'number'
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string';
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `local-${crypto.randomUUID()}`;
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readLocalExercises(): LocalExercise[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_EXERCISES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocalExercise) : [];
  } catch {
    return [];
  }
}

function writeLocalExercises(items: LocalExercise[]) {
  window.localStorage.setItem(LOCAL_EXERCISES_KEY, JSON.stringify(items));
}

export function createLocalExercise(input: NewLocalExercise): LocalExercise {
  const timestamp = new Date().toISOString();
  const exercise: LocalExercise = {
    ...input,
    id: createLocalId(),
    name: input.name.trim(),
    region: input.region.trim() || 'Personalizada',
    category: input.category.trim() || 'Ejercicio personalizado',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeLocalExercises([...readLocalExercises(), exercise]);
  return exercise;
}

export function getLocalExerciseById(id: string) {
  return readLocalExercises().find((exercise) => exercise.id === id) ?? null;
}

export function getExerciseCatalog(): ExerciseCatalogItem[] {
  const demo = exercises.map((exercise) => ({ ...exercise, source: 'demo' as const }));
  const local = readLocalExercises().map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    region: exercise.region,
    category: exercise.category,
    image: exercise.media.type === 'image' && exercise.media.url ? exercise.media.url : exercises[0].image,
    source: 'local' as const,
    details: exercise,
  }));
  return [...local, ...demo];
}

export function getExerciseCatalogItem(id: string) {
  return getExerciseCatalog().find((exercise) => exercise.id === id) ?? null;
}
