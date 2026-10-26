import type { AIWorkContext } from '../../types';

type PatientOption = { id: string; name: string };

function normalizeWords(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

/**
 * A freeform plan request can identify exactly one existing patient by name.
 * Do not guess on missing/ambiguous names or silently change a selected context.
 * No data is written here: canonical execution still requires confirmation.
 */
export function contextForNamedPlanRequest(
  prompt: string,
  context: AIWorkContext,
  patients: PatientOption[],
): AIWorkContext {
  if (context.selectedPatientId || context.selectedPlanId || context.selectedExerciseId) return context;
  const normalized = normalizeWords(prompt);
  if (!/\b(?:crea|crear|prepara|preparar|disena|disenar|arma|armar)\b.{0,120}\b(?:plan|tratamiento|programa)\b/.test(normalized)) return context;

  const words = ` ${normalized} `;
  const matches = patients.filter((patient) => {
    const name = normalizeWords(patient.name);
    return name.length > 0 && words.includes(` ${name} `);
  });
  if (matches.length !== 1) return context;

  return {
    intent: 'create_plan_for_existing_patient',
    patientMode: 'existing',
    selectedPatientId: matches[0].id,
    selectedPlanId: '',
    selectedExerciseId: '',
  };
}
