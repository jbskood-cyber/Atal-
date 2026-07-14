import { getExerciseCatalogItem, type LocalExercise } from '@/src/data/localExercises';
import { getPatientLocalPlans } from '@/src/data/localPlans';
import type { GuidedExercise, GuidedPlan } from './types';

function secondsFromText(value?: string) {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : undefined;
}

function localToGuided(exercise: LocalExercise): GuidedExercise {
  const seconds = secondsFromText(exercise.time);
  return {
    id: exercise.id,
    name: exercise.name,
    region: exercise.region,
    objective: exercise.objective || `Trabajar ${exercise.category.toLowerCase()} de forma controlada`,
    sets: Math.max(1, exercise.sets),
    repetitions: exercise.repetitions,
    seconds,
    restSeconds: secondsFromText(exercise.rest) ?? 0,
    maxPain: exercise.maxPain,
    equipment: exercise.equipment || 'Sin material especial',
    startingPosition: exercise.startingPosition || 'Adopta una posición estable y cómoda.',
    instructions: exercise.instructions.length ? exercise.instructions : ['Realiza el movimiento de forma lenta y controlada.'],
    precautions: exercise.precautions || 'Detente si aparece dolor fuerte o una molestia fuera de lo indicado.',
    therapistCue: exercise.notes || 'Respira con normalidad y prioriza la calidad del movimiento.',
    media: exercise.media,
  };
}

export function resolveGuidedExercise(id: string): GuidedExercise | null {
  const item = getExerciseCatalogItem(id);
  if (!item) return null;
  return localToGuided(item.details);
}

export function resolvePatientPlan(patientId: string): GuidedPlan {
  const plans = getPatientLocalPlans(patientId);
  const localPlan = plans.find((plan)=>plan.status==='active')??plans.find((plan)=>plan.status==='paused');
  if (!localPlan) return {id:`no-active-${patientId}`,status:'none',name:'Sin plan activo',estimatedDuration:'Por definir',therapistMessage:'Tu fisioterapeuta todavía no ha activado un plan.',generalInstructions:'Cuando exista un plan activo aparecerá en este espacio.',exercises:[]};
  return {
    id: localPlan.id,
    status: localPlan.status,
    name: localPlan.title,
    estimatedDuration: localPlan.duration || 'Por definir',
    therapistMessage: localPlan.goal || `Trabajaremos ${localPlan.focus || 'tu recuperación'} de manera progresiva.`,
    generalInstructions: `${localPlan.frequency || 'Frecuencia por definir'}. Respeta las indicaciones, realiza cada movimiento con calma y detente ante dolor fuerte.`,
    exercises: localPlan.exerciseIds.map(resolveGuidedExercise).filter((exercise): exercise is GuidedExercise => Boolean(exercise)),
  };
}
