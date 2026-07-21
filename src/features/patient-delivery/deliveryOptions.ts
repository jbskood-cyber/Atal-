import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanFontScale,
  PatientPlanPageEstimate,
} from './types';

export const DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS: PatientPlanDeliveryOptions = {
  mode: 'simple',
  fontScale: 'large',
  includeExercises: true,
  includeRest: true,
  includeImages: false,
  sessionCount: 8,
  logFields: {
    date: true,
    overallCompletion: true,
    perExerciseCompletion: true,
    painBefore: true,
    painAfter: true,
    difficulty: true,
    notes: true,
  },
};

const MODES = new Set(['simple', 'session-log', 'detailed']);
const FONT_SCALES = new Set(['large', 'extra-large']);

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizePatientPlanDeliveryOptions(
  input: Partial<PatientPlanDeliveryOptions> | undefined,
): PatientPlanDeliveryOptions {
  const source = input ?? {};
  const mode = MODES.has(String(source.mode)) ? source.mode! : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.mode;
  const fontScale = FONT_SCALES.has(String(source.fontScale)) ? source.fontScale! : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.fontScale;
  const includeExercises = asBoolean(source.includeExercises, DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.includeExercises);
  const includeRest = includeExercises && asBoolean(source.includeRest, DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.includeRest);
  const includeImages = mode === 'detailed' && asBoolean(source.includeImages, DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.includeImages);
  const rawSessionCount = Number.isFinite(source.sessionCount) ? Number(source.sessionCount) : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.sessionCount;
  const sessionCount = Math.min(99, Math.max(1, Math.round(rawSessionCount)));
  const incomingFields = source.logFields ?? DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.logFields;
  const logFields = {
    date: asBoolean(incomingFields.date, true),
    overallCompletion: asBoolean(incomingFields.overallCompletion, true),
    perExerciseCompletion: includeExercises && asBoolean(incomingFields.perExerciseCompletion, true),
    painBefore: asBoolean(incomingFields.painBefore, true),
    painAfter: asBoolean(incomingFields.painAfter, true),
    difficulty: asBoolean(incomingFields.difficulty, true),
    notes: asBoolean(incomingFields.notes, true),
  };

  if (!Object.values(logFields).some(Boolean)) logFields.overallCompletion = true;

  return {
    mode,
    fontScale,
    includeExercises,
    includeRest,
    includeImages,
    sessionCount,
    logFields,
  };
}

export function patientPlanFontLabel(fontScale: PatientPlanFontScale) {
  return fontScale === 'extra-large' ? 'letra extra grande' : 'letra grande';
}

export function simpleExerciseRowsPerPage(fontScale: PatientPlanFontScale) {
  return fontScale === 'extra-large' ? 5 : 6;
}

export function patientSessionRowHeight(options: PatientPlanDeliveryOptions) {
  const normalized = normalizePatientPlanDeliveryOptions(options);
  let height = normalized.fontScale === 'extra-large' ? 104 : 88;
  if (normalized.logFields.perExerciseCompletion) height += normalized.fontScale === 'extra-large' ? 24 : 20;
  if (normalized.logFields.notes) height += normalized.fontScale === 'extra-large' ? 20 : 16;
  return height;
}

export function patientSessionPageCapacities(
  documentModel: PatientPlanDocument,
  options: PatientPlanDeliveryOptions,
) {
  const normalized = normalizePatientPlanDeliveryOptions(options);
  const rowHeight = patientSessionRowHeight(normalized);
  const exerciseLegendRows = normalized.includeExercises ? Math.ceil(documentModel.exercises.length / 2) : 0;
  const legendHeight = normalized.includeExercises ? Math.min(150, 34 + exerciseLegendRows * (normalized.fontScale === 'extra-large' ? 28 : 24)) : 0;
  const firstAvailable = Math.max(rowHeight, 500 - legendHeight);
  const continuationAvailable = 690;
  return {
    rowHeight,
    first: Math.max(1, Math.floor(firstAvailable / rowHeight)),
    continuation: Math.max(1, Math.floor(continuationAvailable / rowHeight)),
  };
}

export function estimatePatientPlanPages(
  documentModel: PatientPlanDocument,
  input: Partial<PatientPlanDeliveryOptions> | undefined,
): PatientPlanPageEstimate {
  const options = normalizePatientPlanDeliveryOptions(input);
  const exerciseRowsPerPage = simpleExerciseRowsPerPage(options.fontScale);
  let pageCount = 1;
  let sessionsPerFirstPage = 0;
  let sessionsPerContinuationPage = 0;

  if (options.mode === 'simple' && options.includeExercises) {
    pageCount = Math.max(1, Math.ceil(documentModel.exercises.length / exerciseRowsPerPage));
  }

  if (options.mode === 'detailed') {
    pageCount = 1 + documentModel.exercises.length;
  }

  if (options.mode === 'session-log') {
    const capacities = patientSessionPageCapacities(documentModel, options);
    sessionsPerFirstPage = capacities.first;
    sessionsPerContinuationPage = capacities.continuation;
    const remaining = Math.max(0, options.sessionCount - capacities.first);
    pageCount = 1 + (remaining ? Math.ceil(remaining / capacities.continuation) : 0);
  }

  const parts = [`${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`, patientPlanFontLabel(options.fontScale)];
  if (options.mode === 'session-log') parts.push(`${options.sessionCount} sesiones`);
  if (options.includeExercises) parts.push(`${documentModel.exercises.length} ejercicios`);
  else parts.push('sin ejercicios');

  return {
    pageCount,
    exerciseRowsPerPage,
    sessionsPerFirstPage,
    sessionsPerContinuationPage,
    summary: parts.join(' · '),
  };
}
