import { A4_WIDTH, wrapPdfText } from './pdfWriter';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanDocumentExercise,
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

const PDF_MARGIN = 38;
const PLAN_TEXT_X = PDF_MARGIN + 57;
const PLAN_TEXT_WIDTH = A4_WIDTH - PDF_MARGIN - PLAN_TEXT_X;
const PLAN_DOSE_WIDTH = 285;
const PLAN_REST_WIDTH = 155;
const PLAN_CONTINUATION_TOP = 634;
const PLAN_NON_FINAL_BOTTOM = 58;
const PLAN_FINAL_BOTTOM = 108;
const LOG_ROWS_TOP = 546;
const LOG_NON_FINAL_BOTTOM = 85;
const LOG_FINAL_BOTTOM = 205;
const LOG_NAME_WIDTH = 154 - 39;
const LOG_DOSE_WIDTH = 127 - 16;

export type PatientPlanMeasuredRow = {
  exercise: PatientPlanDocumentExercise;
  height: number;
  nameLines: number;
  doseLines: number;
  restLines: number;
  cueLines: number;
};

export type PatientPlanLayoutPage = {
  rows: PatientPlanMeasuredRow[];
  continuation: boolean;
  final: boolean;
};

export type PatientLogMeasuredRow = {
  exercise: PatientPlanDocumentExercise;
  height: number;
  nameLines: number;
  doseLines: number;
};

export type PatientLogLayoutPage = {
  rows: PatientLogMeasuredRow[];
  continuation: boolean;
  final: boolean;
};

export type PatientPlanFirstPageHeaderLayout = {
  patientNameY: number;
  patientNameLines: number;
  planTitleY: number;
  planTitleLines: number;
  diagnosisY: number;
  diagnosisLines: number;
  separatorY: number;
  frequencyLabelY: number;
  frequencyY: number;
  frequencyLines: number;
  durationY: number;
  durationLines: number;
  objectiveLabelY: number;
  objectiveY: number;
  objectiveLines: number;
  exercisesLabelY: number;
  rowsTop: number;
};

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

function meaningfulEquipment(value: string) {
  const equipment = value.trim();
  if (!equipment || /^(sin material especial|sin material|ningun[oa]|no aplica|según indicación)$/i.test(equipment)) return '';
  return equipment;
}

export function compactPatientPlanDose(exercise: PatientPlanDocumentExercise) {
  const dose = exercise.doseLabel.replace(/\s*·\s*descanso.*$/i, '').trim() || exercise.doseLabel;
  const equipment = meaningfulEquipment(exercise.equipment);
  return equipment ? `${dose} · ${equipment}` : dose;
}

function visibleLineCount(text: string, width: number, size: number, font: 'regular' | 'bold') {
  return Math.max(1, wrapPdfText(text, width, size, font).length);
}

export function measurePatientPlanFirstPageHeader(
  documentModel: PatientPlanDocument,
  fontScale: PatientPlanFontScale,
): PatientPlanFirstPageHeaderLayout {
  const extraLarge = fontScale === 'extra-large';
  const patientNameY = 714;
  const patientNameSize = extraLarge ? 27 : 24;
  const patientNameLineHeight = extraLarge ? 31 : 28;
  const patientNameLines = visibleLineCount(documentModel.patient.name, 395, patientNameSize, 'bold');
  const patientNameBottom = patientNameY - patientNameLines * patientNameLineHeight;

  const planTitleSize = extraLarge ? 18 : 16;
  const planTitleLineHeight = extraLarge ? 22 : 20;
  const planTitleY = Math.min(653, patientNameBottom - 18);
  const planTitleLines = visibleLineCount(documentModel.plan.title, A4_WIDTH - PDF_MARGIN * 2, planTitleSize, 'bold');
  const planTitleBottom = planTitleY - planTitleLines * planTitleLineHeight;

  const diagnosisSize = extraLarge ? 12.5 : 11.3;
  const diagnosisLineHeight = extraLarge ? 16 : 14;
  const diagnosisText = `${documentModel.patient.diagnosis} · ${documentModel.patient.affectedArea}`;
  const diagnosisY = Math.min(607, planTitleBottom - 14);
  const diagnosisLines = visibleLineCount(diagnosisText, A4_WIDTH - PDF_MARGIN * 2, diagnosisSize, 'regular');
  const diagnosisBottom = diagnosisY - diagnosisLines * diagnosisLineHeight;

  const separatorY = Math.min(573, diagnosisBottom - 18);
  const frequencyLabelY = separatorY - 25;
  const frequencyY = frequencyLabelY - 22;
  const durationY = frequencyY;
  const valueSize = extraLarge ? 15 : 13.5;
  const valueLineHeight = extraLarge ? 18 : 16;
  const frequencyLines = visibleLineCount(documentModel.plan.frequency, 235, valueSize, 'bold');
  const durationLines = visibleLineCount(documentModel.plan.duration, 220, valueSize, 'bold');
  const valueBottom = Math.min(
    frequencyY - frequencyLines * valueLineHeight,
    durationY - durationLines * valueLineHeight,
  );

  const objectiveLabelY = Math.min(481, valueBottom - 22);
  const objectiveY = objectiveLabelY - 23;
  const objectiveSize = extraLarge ? 14.5 : 12.8;
  const objectiveLineHeight = extraLarge ? 18 : 16;
  const objectiveLines = visibleLineCount(documentModel.plan.objective, A4_WIDTH - PDF_MARGIN * 2, objectiveSize, 'regular');
  const objectiveBottom = objectiveY - objectiveLines * objectiveLineHeight;
  const exercisesLabelY = Math.min(397, objectiveBottom - 20);
  if (exercisesLabelY < 82) {
    throw new Error('El encabezado clínico contiene más texto del que puede mostrarse de forma legible en una página. Acorta únicamente el texto redundante antes de generar el documento.');
  }

  return {
    patientNameY,
    patientNameLines,
    planTitleY,
    planTitleLines,
    diagnosisY,
    diagnosisLines,
    separatorY,
    frequencyLabelY,
    frequencyY,
    frequencyLines,
    durationY,
    durationLines,
    objectiveLabelY,
    objectiveY,
    objectiveLines,
    exercisesLabelY,
    rowsTop: exercisesLabelY - 17,
  };
}

export function measurePatientPlanRow(
  exercise: PatientPlanDocumentExercise,
  fontScale: PatientPlanFontScale,
): PatientPlanMeasuredRow {
  const extraLarge = fontScale === 'extra-large';
  const nameSize = extraLarge ? 15 : 13.5;
  const nameLineHeight = extraLarge ? 17.5 : 15.5;
  const doseSize = extraLarge ? 12.5 : 11.3;
  const doseLineHeight = extraLarge ? 14.5 : 13;
  const cueSize = extraLarge ? 11.5 : 10.3;
  const cueLineHeight = extraLarge ? 13.5 : 12.5;
  const cue = exercise.therapistNotes || exercise.objective;
  const nameLines = visibleLineCount(exercise.name, PLAN_TEXT_WIDTH, nameSize, 'bold');
  const doseLines = visibleLineCount(compactPatientPlanDose(exercise), PLAN_DOSE_WIDTH, doseSize, 'regular');
  const restLines = visibleLineCount(`Descanso: ${exercise.rest}`, PLAN_REST_WIDTH, doseSize - 0.5, 'regular');
  const cueLines = visibleLineCount(`Clave: ${cue}`, PLAN_TEXT_WIDTH, cueSize, 'regular');
  const middleHeight = Math.max(doseLines, restLines) * doseLineHeight;
  const measured = 12
    + nameLines * nameLineHeight
    + 2
    + middleHeight
    + 2
    + cueLines * cueLineHeight
    + 7;

  return {
    exercise,
    height: Math.max(extraLarge ? 68 : 63, Math.ceil(measured)),
    nameLines,
    doseLines,
    restLines,
    cueLines,
  };
}

export function measurePatientLogRow(
  exercise: PatientPlanDocumentExercise,
  fontScale: PatientPlanFontScale,
): PatientLogMeasuredRow {
  const extraLarge = fontScale === 'extra-large';
  const nameSize = extraLarge ? 11 : 9.8;
  const nameLineHeight = extraLarge ? 13.5 : 12;
  const doseSize = extraLarge ? 10 : 9;
  const doseLineHeight = extraLarge ? 12.5 : 11;
  const nameLines = visibleLineCount(exercise.name, LOG_NAME_WIDTH, nameSize, 'bold');
  const doseLines = visibleLineCount(compactPatientPlanDose(exercise), LOG_DOSE_WIDTH, doseSize, 'regular');
  const measured = 18 + Math.max(nameLines * nameLineHeight, doseLines * doseLineHeight) + 14;

  return {
    exercise,
    height: Math.max(extraLarge ? 64 : 55, Math.ceil(measured)),
    nameLines,
    doseLines,
  };
}

function packMeasuredRows<T extends { height: number }>(
  rows: T[],
  firstTop: number,
  continuationTop: number,
  nonFinalBottom: number,
  finalBottom: number,
) {
  const maximumAvailable = continuationTop - finalBottom;
  if (rows.some((row) => row.height > maximumAvailable)) {
    throw new Error('Un ejercicio contiene más información de la que cabe completa en una página. Reduce únicamente el texto redundante antes de generar el documento.');
  }

  const pages: Array<{ rows: T[]; continuation: boolean; final: boolean }> = [];
  let start = 0;

  while (start < rows.length) {
    const continuation = pages.length > 0;
    const top = continuation ? continuationTop : firstTop;
    const remaining = rows.slice(start);
    const remainingHeight = remaining.reduce((sum, row) => sum + row.height, 0);

    if (remainingHeight <= top - finalBottom) {
      pages.push({ rows: remaining, continuation, final: true });
      break;
    }

    const available = top - nonFinalBottom;
    let used = 0;
    let count = 0;
    while (start + count < rows.length && used + rows[start + count].height <= available) {
      used += rows[start + count].height;
      count += 1;
    }

    if (count === 0) count = 1;
    if (start + count === rows.length && count > 1) count -= 1;
    pages.push({ rows: rows.slice(start, start + count), continuation, final: false });
    start += count;
  }

  return pages;
}

export function layoutPatientPlanPages(
  documentModel: PatientPlanDocument,
  fontScale: PatientPlanFontScale,
): PatientPlanLayoutPage[] {
  const rows = documentModel.exercises.map((exercise) => measurePatientPlanRow(exercise, fontScale));
  const header = measurePatientPlanFirstPageHeader(documentModel, fontScale);
  const firstRowHeight = rows[0]?.height ?? 0;
  const firstPageCanFitARow = !rows.length || firstRowHeight <= header.rowsTop - PLAN_NON_FINAL_BOTTOM;

  if (!firstPageCanFitARow) {
    const continuationPages = packMeasuredRows(
      rows,
      PLAN_CONTINUATION_TOP,
      PLAN_CONTINUATION_TOP,
      PLAN_NON_FINAL_BOTTOM,
      PLAN_FINAL_BOTTOM,
    ).map((page) => ({ ...page, continuation: true }));
    return [{ rows: [], continuation: false, final: false }, ...continuationPages];
  }

  return packMeasuredRows(rows, header.rowsTop, PLAN_CONTINUATION_TOP, PLAN_NON_FINAL_BOTTOM, PLAN_FINAL_BOTTOM);
}

export function layoutPatientLogPages(
  documentModel: PatientPlanDocument,
  fontScale: PatientPlanFontScale,
): PatientLogLayoutPage[] {
  const rows = documentModel.exercises.map((exercise) => measurePatientLogRow(exercise, fontScale));
  return packMeasuredRows(rows, LOG_ROWS_TOP, LOG_ROWS_TOP, LOG_NON_FINAL_BOTTOM, LOG_FINAL_BOTTOM);
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
  const planPageCount = includesPlan ? layoutPatientPlanPages(documentModel, options.fontScale).length : 0;
  const logPagesPerSession = includesLog ? layoutPatientLogPages(documentModel, options.fontScale).length : 0;
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
