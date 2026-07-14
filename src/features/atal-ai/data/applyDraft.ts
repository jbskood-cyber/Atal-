import { createLocalExercise, getExerciseCatalog, LOCAL_EXERCISES_KEY } from '@/src/data/localExercises';
import { createLocalPlan, LOCAL_PLANS_KEY } from '@/src/data/localPlans';
import { createLocalPatient, LOCAL_PATIENTS_KEY } from '@/src/data/localPatients';
import { CLINICAL_RECORDS_KEY, createClinicalRecord } from '@/src/features/clinical-record/clinicalRecordRepository';
import type { AtalAIDraft, PrivateContactDraft } from '../types';

const transactionKeys = [LOCAL_PATIENTS_KEY, LOCAL_EXERCISES_KEY, LOCAL_PLANS_KEY, CLINICAL_RECORDS_KEY] as const;

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function numberFromText(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function durationText(draft: AtalAIDraft['plan']['duration']) {
  if (draft.customText.trim()) return draft.customText.trim();
  if (draft.value === null) return 'Por definir';
  return `${draft.value} ${draft.unit === 'days' ? 'días' : draft.unit === 'months' ? 'meses' : 'semanas'}`;
}

function frequencyText(draft: AtalAIDraft['plan']['frequency']) {
  if (draft.customText.trim()) return draft.customText.trim();
  if (draft.value === null) return 'Según tolerancia';
  const period = draft.period === 'day' ? 'día' : draft.period === 'month' ? 'mes' : 'semana';
  return `${draft.value} ${draft.value === 1 ? 'vez' : 'veces'} por ${period}`;
}

export function applyAtalAIDraft(draft: AtalAIDraft, contact: PrivateContactDraft) {
  if (!draft.patient.name.trim()) throw new Error('Añade el nombre del paciente antes de confirmar.');
  if (!draft.plan.title.trim()) throw new Error('Añade un título al plan antes de confirmar.');
  const snapshots = new Map(transactionKeys.map((key) => [key, window.localStorage.getItem(key)]));
  try {
    const patient = createLocalPatient({ name: draft.patient.name, diagnosis: draft.patient.providedDiagnosis || draft.patient.reasonForVisit, age: draft.patient.age, birthDate: draft.patient.birthDate, sex: draft.patient.sex, affectedArea: draft.patient.affectedArea, contact });
    const existing = getExerciseCatalog();
    const exerciseIds = draft.exercises.filter((exercise) => exercise.name.trim()).map((exercise) => {
      if (exercise.sets === null) throw new Error(`Completa las series de “${exercise.name}” antes de confirmar.`);
      const clearMatch = existing.find((item) => normalize(item.name) === normalize(exercise.name) && (!exercise.region.trim() || normalize(item.region) === normalize(exercise.region)));
      if (clearMatch && exercise.reusePreference !== 'create-new') return clearMatch.id;
      const repetitions = numberFromText(exercise.repetitions);
      return createLocalExercise({
        name: exercise.name, region: exercise.region, category: exercise.category, objective: exercise.objective,
        startingPosition: exercise.startingPosition, instructions: exercise.instructions, precautions: exercise.precautions.join('\n'),
        equipment: exercise.equipment, difficulty: exercise.difficulty, sets: Math.max(1, exercise.sets), repetitions,
        time: repetitions ? undefined : exercise.duration || undefined, rest: exercise.rest, maxPain: exercise.maxPain,
        tags: exercise.tags, notes: exercise.notes, media: { type: 'none' },
      }).id;
    });
    const plan = createLocalPlan({ patientId: patient.id, title: draft.plan.title, focus: draft.plan.focus, duration: durationText(draft.plan.duration), frequency: frequencyText(draft.plan.frequency), goal: draft.plan.goal, exerciseIds, status: draft.plan.status });
    const clinicalRecord = createClinicalRecord({
      patientId: patient.id, date: new Date().toISOString(), reasonForVisit: draft.patient.reasonForVisit,
      evolution: draft.patient.evolutionTime, affectedArea: draft.patient.affectedArea, symptoms: draft.patient.symptoms, painLevel: draft.patient.painLevel,
      providedDiagnosis: draft.patient.providedDiagnosis, functionalLimitations: draft.patient.functionalLimitations, goals: draft.patient.goals,
      relevantHistory: draft.patient.relevantHistory, precautions: draft.patient.precautions, clinicalNotes: draft.patient.clinicalNotes,
      planId: plan.id, professional: 'Cuenta demo',
    });
    return { patientId: patient.id, planId: plan.id, clinicalRecordId: clinicalRecord.id };
  } catch (error) {
    for (const [key, value] of snapshots) value === null ? window.localStorage.removeItem(key) : window.localStorage.setItem(key, value);
    throw error;
  }
}
