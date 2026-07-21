import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanFontScale,
  PatientPlanPageEstimate,
} from './types';

export const DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS: PatientPlanDeliveryOptions = {
  mode: 'plan-and-log',
  fontScale: 'large',
  includeImages: false,
  sessionCount: 8,
};

const MODES = new Set(['plan-and-log', 'plan-only', 'log-only', 'detailed']);
const FONT_SCALES = new Set(['large', 'extra-large']);

export function normalizePatientPlanDeliveryOptions(
  input: Partial<PatientPlanDeliveryOptions> | undefined,
): PatientPlanDeliveryOptions {
  const source = input ?? {};
  const mode = MODES.has(String(source.mode)) ? source.mode! : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.mode;
  const fontScale = FONT_SCALES.has(String(source.fontScale)) ? source.fontScale! : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.fontScale;
  const includeImages = mode === 'detailed' && source.includeImages === true;
  const rawSessionCount = typeof source.sessionCount === 'number' && Number.isFinite(source.sessionCount)
    ? source.sessionCount
    : DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.sessionCount;
  const sessionCount = Math.min(99, Math.max(1, Math.round(rawSessionCount)));

  return { mode, fontScale, includeImages, sessionCount };
}

export function patientPlanFontLabel(fontScale: PatientPlanFontScale) {
  return fontScale === 'extra-large' ? 'letra extra grande' : 'letra grande';
}

export function patientPlanExerciseCapacities(fontScale: PatientPlanFontScale) {
  return fontScale === 'extra-large'
    ? { first: 3, continuation: 4 }
    : { first: 4, continuation: 6 };
}

export function patientLogExerciseCapacity(fontScale: PatientPlanFontScale) {
  return fontScale === 'extra-large' ? 5 : 6;
}

export function estimatePatientPlanPages(
  documentModel: PatientPlanDocument,
  input: Partial<PatientPlanDeliveryOptions> | undefined,
): PatientPlanPageEstimate {
  const options = normalizePatientPlanDeliveryOptions(input);
  if (options.mode === 'detailed') {
    const pageCount = 1 + documentModel.exercises.length;
    return {
      pageCount,
      planPageCount: pageCount,
      logPageCount: 0,
      logPagesPerSession: 0,
      summary: `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'} · documento detallado`,
    };
  }

  const includesPlan = options.mode === 'plan-and-log' || options.mode === 'plan-only';
  const includesLog = options.mode === 'plan-and-log' || options.mode === 'log-only';
  const planCapacity = patientPlanExerciseCapacities(options.fontScale);
  const remainingPlanExercises = Math.max(0, documentModel.exercises.length - planCapacity.first);
  const planPageCount = includesPlan
    ? 1 + Math.ceil(remainingPlanExercises / planCapacity.continuation)
    : 0;
  const logCapacity = patientLogExerciseCapacity(options.fontScale);
  const logPagesPerSession = includesLog
    ? Math.max(1, Math.ceil(documentModel.exercises.length / logCapacity))
    : 0;
  const logPageCount = includesLog ? options.sessionCount * logPagesPerSession : 0;
  const pageCount = planPageCount + logPageCount;

  const contentLabel = options.mode === 'plan-and-log'
    ? `plan + ${options.sessionCount} sesiones`
    : options.mode === 'plan-only'
      ? 'solo plan'
      : `${options.sessionCount} sesiones`;

  return {
    pageCount,
    planPageCount,
    logPageCount,
    logPagesPerSession,
    summary: `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'} · ${patientPlanFontLabel(options.fontScale)} · ${contentLabel}`,
  };
}
