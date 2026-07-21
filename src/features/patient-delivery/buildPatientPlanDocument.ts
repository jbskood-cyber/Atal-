import type { AtalState, ExerciseEntity, PlanStatus } from '@/src/data/atalStore';
import {
  PATIENT_PLAN_DOCUMENT_VERSION,
  type PatientPlanDeliveryEligibility,
  type PatientPlanDocument,
} from './types';

const planStatusLabel: Record<PlanStatus, string> = {
  active: 'activo',
  paused: 'pausado',
  draft: 'borrador',
  completed: 'completado',
  archived: 'archivado',
};

export function formatExerciseDose(exercise: Pick<ExerciseEntity, 'sets' | 'repetitions' | 'time' | 'rest'>) {
  const sets = `${Math.max(1, exercise.sets)} ${exercise.sets === 1 ? 'serie' : 'series'}`;
  const work = exercise.repetitions && exercise.repetitions > 0
    ? `${exercise.repetitions} ${exercise.repetitions === 1 ? 'repetición' : 'repeticiones'}`
    : exercise.time?.trim() || 'duración indicada por el fisioterapeuta';
  const rest = exercise.rest.trim() ? ` · descanso ${exercise.rest.trim()}` : '';
  return `${sets} × ${work}${rest}`;
}

export function getPatientPlanDeliveryEligibility(
  state: AtalState,
  patientId: string,
  planId: string,
): PatientPlanDeliveryEligibility {
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'Plan no encontrado.', missingExerciseIds: [] };
  if (plan.patientId !== patientId) return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'El plan no pertenece a este paciente.', missingExerciseIds: [] };
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'Paciente no encontrado.', missingExerciseIds: [] };

  const missingExerciseIds = plan.exerciseIds.filter((id) => !state.exercises.some((exercise) => exercise.id === id));
  if (patient.status === 'archived') return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'Restaura al paciente antes de entregar un plan.', missingExerciseIds };
  if (plan.status === 'archived') return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'Un plan archivado no puede entregarse como tratamiento vigente.', missingExerciseIds };
  if (!plan.exerciseIds.length) return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'Añade al menos un ejercicio antes de generar el documento.', missingExerciseIds };
  if (missingExerciseIds.length) return { allowed: false, requiresConfirmation: false, state: 'blocked', reason: 'El plan contiene ejercicios que ya no están disponibles.', missingExerciseIds };
  if (plan.status === 'active') return { allowed: true, requiresConfirmation: false, state: 'ready', reason: 'Plan activo listo para entregar.', missingExerciseIds: [] };

  return {
    allowed: true,
    requiresConfirmation: true,
    state: 'warning',
    reason: `Este plan está ${planStatusLabel[plan.status]}. El documento conservará ese estado y no se presentará como tratamiento activo.`,
    missingExerciseIds: [],
  };
}

export function buildPatientPlanDocument(
  state: AtalState,
  patientId: string,
  planId: string,
  generatedAt = new Date().toISOString(),
): PatientPlanDocument {
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan || plan.patientId !== patientId) throw new Error('Plan no encontrado para este paciente.');
  const patient = state.patients.find((item) => item.id === patientId);
  if (!patient) throw new Error('Paciente no encontrado.');

  const eligibility = getPatientPlanDeliveryEligibility(state, patientId, planId);
  if (!eligibility.allowed) throw new Error(eligibility.reason);

  const exercises = plan.exerciseIds.map((id, index) => {
    const exercise = state.exercises.find((item) => item.id === id);
    if (!exercise) throw new Error(`No pudimos encontrar el ejercicio ${index + 1}.`);
    return {
      id: exercise.id,
      order: index + 1,
      name: exercise.name.trim(),
      region: exercise.region.trim() || 'Zona por definir',
      category: exercise.category.trim() || 'Ejercicio terapéutico',
      objective: exercise.objective.trim() || 'Realizar el movimiento de forma progresiva y controlada.',
      startingPosition: exercise.startingPosition.trim() || 'Adopta una posición cómoda y estable.',
      instructions: exercise.instructions.map((item) => item.trim()).filter(Boolean),
      precautions: exercise.precautions.trim() || 'Detente si aparece dolor fuerte o una molestia fuera de lo indicado.',
      equipment: exercise.equipment.trim() || 'Sin material especial',
      sets: Math.max(1, exercise.sets),
      repetitions: exercise.repetitions,
      duration: exercise.time?.trim() || undefined,
      rest: exercise.rest.trim() || 'Sin descanso específico',
      maxPain: exercise.maxPain,
      therapistNotes: exercise.notes.trim(),
      doseLabel: formatExerciseDose(exercise),
      media: { ...exercise.media },
    };
  });

  return {
    version: PATIENT_PLAN_DOCUMENT_VERSION,
    generatedAt,
    patient: {
      id: patient.id,
      name: patient.name.trim(),
      diagnosis: patient.diagnosis.trim() || 'Motivo por completar',
      affectedArea: patient.affectedArea.trim() || 'Zona por completar',
    },
    professional: {
      name: state.settings.professionalName.trim() || 'Fisioterapeuta responsable',
      specialty: state.settings.specialty.trim() || 'Fisioterapia',
      clinic: state.settings.clinic.trim() || 'Atal Fisioterapia',
    },
    plan: {
      id: plan.id,
      title: plan.title.trim(),
      status: plan.status,
      focus: plan.focus.trim(),
      objective: plan.goal.trim() || plan.focus.trim() || 'Recuperar función y tolerancia al movimiento.',
      duration: plan.duration.trim() || 'Por definir',
      frequency: plan.frequency.trim() || 'Por definir',
      progression: plan.progression.trim(),
      reportCriteria: plan.reportCriteria.trim(),
      generalInstructions: plan.generalInstructions.trim() || 'Realiza cada ejercicio con calma y respeta las indicaciones de tu fisioterapeuta.',
      updatedAt: plan.updatedAt,
    },
    exercises,
    delivery: {
      generatedLocally: true,
      publicLinkCreated: false,
      addressedDocument: true,
    },
  };
}

export function patientPlanStatusLabel(status: PlanStatus) {
  return planStatusLabel[status].replace(/^./, (character) => character.toUpperCase());
}
