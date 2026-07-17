import { exercises, patients, plans } from '@/src/data/atal-demo';
import type { GuidedExercise, GuidedPlan } from './types';

const detailedDemoExercises: Record<string, Omit<GuidedExercise, 'id' | 'name' | 'region' | 'media'>> = {
  e03: { objective: 'Activar glúteos y mejorar el control de pelvis', sets: 3, repetitions: 10, restSeconds: 35, maxPain: 3, equipment: 'Tapete', startingPosition: 'Acuéstate boca arriba con rodillas flexionadas y pies apoyados al ancho de la cadera.', instructions: ['Activa suavemente el abdomen.', 'Eleva la pelvis sin arquear la espalda.', 'Sostén un segundo y desciende lentamente.'], precautions: 'Detente si el dolor baja por la pierna o aparece mareo.', therapistCue: 'Mantén las rodillas alineadas y el movimiento tranquilo.' },
  e07: { objective: 'Mejorar estabilidad lumbopélvica', sets: 3, repetitions: 8, restSeconds: 40, maxPain: 3, equipment: 'Tapete', startingPosition: 'Colócate en cuatro puntos, manos bajo hombros y rodillas bajo cadera.', instructions: ['Alarga brazo y pierna contraria.', 'Evita girar la pelvis.', 'Regresa con control y cambia de lado.'], precautions: 'Reduce el alcance si pierdes estabilidad o aparece dolor.', therapistCue: 'Imagina un vaso sobre tu espalda: evita que se incline.' },
  e10: { objective: 'Recuperar movilidad sin irritar el tejido', sets: 2, seconds: 30, restSeconds: 20, maxPain: 2, equipment: 'Toalla opcional', startingPosition: 'Acuéstate boca arriba y eleva una pierna con la rodilla ligeramente flexionada.', instructions: ['Sujeta la pierna sin forzar.', 'Mantén una tensión cómoda.', 'Respira y cambia de lado al terminar.'], precautions: 'No rebotes ni busques dolor intenso.', therapistCue: 'Debe sentirse como tensión suave, nunca como ardor o descarga.' },
};

export function createDemoGuidedExercise(id: string): GuidedExercise | null {
  const exercise = exercises.find((item) => item.id === id);
  if (!exercise) return null;
  const detail = detailedDemoExercises[id] ?? {
    objective: `Mejorar ${exercise.category.toLowerCase()} de ${exercise.region.toLowerCase()} con movimiento controlado`,
    sets: 3,
    repetitions: 10,
    restSeconds: 30,
    maxPain: 3,
    equipment: 'Sin material especial',
    startingPosition: 'Adopta una posición estable y cómoda antes de comenzar.',
    instructions: ['Prepara la postura indicada.', 'Realiza el movimiento de forma lenta y controlada.', 'Regresa a la posición inicial sin compensaciones.'],
    precautions: 'Detente si aparece dolor fuerte, mareo o una sensación fuera de lo habitual.',
    therapistCue: 'Prioriza la calidad del movimiento y respira con normalidad.',
  };
  return { id: exercise.id, name: exercise.name, region: exercise.region, media: { type: 'image', url: exercise.image }, ...detail };
}

export function createDemoPatientPlan(patientId: string): GuidedPlan {
  const patientIndex = Math.max(0, patients.findIndex((patient) => patient.id === patientId));
  const patient = patients[patientIndex];
  const demoPlan = plans.find((plan) => plan.patient === patient?.name);
  const exerciseIds = Array.from({ length: 3 }, (_, index) => exercises[(patientIndex * 3 + index) % exercises.length].id);
  return {
    id: `demo-plan-${patientId}`,
    status: 'active',
    name: demoPlan?.title ?? 'Plan de recuperación personalizado',
    estimatedDuration: demoPlan?.duration ?? '18–22 minutos',
    therapistMessage: `Este plan demostrativo está preparado para ${patient?.diagnosis.toLowerCase() ?? 'tu recuperación'}. Prioriza calidad antes que velocidad.`,
    generalInstructions: 'Respira con normalidad, evita compensaciones y respeta el rango que te indicó tu fisioterapeuta.',
    exercises: exerciseIds.map(createDemoGuidedExercise).filter((exercise): exercise is GuidedExercise => Boolean(exercise)),
  };
}
