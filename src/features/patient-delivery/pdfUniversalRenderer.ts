import { patientPlanFilename } from './deliveryActions';
import {
  compactPatientPlanDose,
  estimatePatientPlanPages,
  layoutPatientLogPages,
  layoutPatientPlanPages,
  measurePatientPlanFirstPageHeader,
  normalizePatientPlanDeliveryOptions,
  type PatientLogLayoutPage,
  type PatientLogMeasuredRow,
  type PatientPlanLayoutPage,
  type PatientPlanMeasuredRow,
} from './deliveryOptions';
import { A4_HEIGHT, A4_WIDTH, LocalPdfDocument, type LocalPdfPage, type PdfColor, wrapPdfText } from './pdfWriter';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanPdfResult,
} from './types';
import { patientPlanStatusLabel } from './buildPatientPlanDocument';

const INK: PdfColor = [0.067, 0.067, 0.067];
const CHARCOAL: PdfColor = [0.2, 0.2, 0.2];
const MUTED: PdfColor = [0.4, 0.4, 0.4];
const RULE: PdfColor = [0.74, 0.74, 0.74];
const SOFT_RULE: PdfColor = [0.88, 0.88, 0.88];
const TINT: PdfColor = [0.965, 0.965, 0.955];
const MARGIN = 38;
const FOOTER_Y = 28;

function drawWrapped(
  page: LocalPdfPage,
  text: string,
  x: number,
  y: number,
  width: number,
  options: {
    size?: number;
    lineHeight?: number;
    color?: PdfColor;
    font?: 'regular' | 'bold';
    maxLines?: number;
  } = {},
) {
  const size = options.size ?? 11;
  const lineHeight = options.lineHeight ?? size * 1.35;
  const lines = wrapPdfText(text, width, size, options.font ?? 'regular');
  const visible = options.maxLines ? lines.slice(0, options.maxLines) : lines;
  visible.forEach((line, index) => page.drawText(line, {
    x,
    y: y - index * lineHeight,
    size,
    color: options.color ?? INK,
    font: options.font,
  }));
  return { bottom: y - visible.length * lineHeight, lines: visible.length };
}

function drawDocumentHeader(page: LocalPdfPage, title: string, pageNumber: number, totalPages: number) {
  page.drawText('Atal', { x: MARGIN, y: A4_HEIGHT - 34, size: 20, font: 'bold', color: INK });
  page.drawText(title, { x: 112, y: A4_HEIGHT - 31, size: 9.5, font: 'bold', color: MUTED });
  page.drawText(String(pageNumber).padStart(2, '0'), { x: A4_WIDTH - MARGIN - 20, y: A4_HEIGHT - 31, size: 8.5, font: 'bold', color: MUTED });
  page.drawLine({ x1: MARGIN, y1: A4_HEIGHT - 48, x2: A4_WIDTH - MARGIN, y2: A4_HEIGHT - 48, stroke: INK, lineWidth: 1 });
  page.drawText(`${pageNumber} / ${totalPages}`, { x: A4_WIDTH - MARGIN - 28, y: FOOTER_Y + 2, size: 8.5, color: MUTED });
}

function drawFooter(page: LocalPdfPage, documentModel: PatientPlanDocument) {
  page.drawLine({ x1: MARGIN, y1: FOOTER_Y + 17, x2: A4_WIDTH - MARGIN, y2: FOOTER_Y + 17, stroke: SOFT_RULE, lineWidth: 0.6 });
  drawWrapped(page, documentModel.patient.name, MARGIN, FOOTER_Y + 2, 285, { size: 8.5, color: MUTED, maxLines: 1 });
  drawWrapped(page, documentModel.professional.clinic, 365, FOOTER_Y + 2, A4_WIDTH - MARGIN - 365, { size: 8.5, color: MUTED, maxLines: 1 });
}

function drawCheckbox(page: LocalPdfPage, x: number, y: number, label: string, size: number, fontSize: number) {
  page.strokeRect({ x, y: y - size + 2, width: size, height: size, stroke: CHARCOAL, lineWidth: 0.9 });
  page.drawText(label, { x: x + size + 6, y: y - size + 4, size: fontSize, color: INK });
}

function drawBlankField(page: LocalPdfPage, x: number, y: number, width: number, height: number) {
  page.strokeRect({ x, y, width, height, stroke: RULE, lineWidth: 0.7 });
}

function drawPlanExerciseRow(
  page: LocalPdfPage,
  row: PatientPlanMeasuredRow,
  top: number,
  extraLarge: boolean,
) {
  const exercise = row.exercise;
  page.drawRect({ x: MARGIN, y: top - row.height + 5, width: 42, height: row.height - 10, fill: TINT });
  page.drawText(String(exercise.order).padStart(2, '0'), {
    x: MARGIN + 11,
    y: top - row.height / 2 - 2,
    size: extraLarge ? 13 : 11.5,
    font: 'bold',
    color: CHARCOAL,
  });

  const x = MARGIN + 57;
  const nameSize = extraLarge ? 15 : 13.5;
  const nameLineHeight = extraLarge ? 17.5 : 15.5;
  const doseSize = extraLarge ? 12.5 : 11.3;
  const doseLineHeight = extraLarge ? 14.5 : 13;
  const cueSize = extraLarge ? 11.5 : 10.3;
  const cueLineHeight = extraLarge ? 13.5 : 12.5;
  const cue = exercise.therapistNotes || exercise.objective;

  const name = drawWrapped(page, exercise.name, x, top - 12, A4_WIDTH - MARGIN - x, {
    size: nameSize,
    lineHeight: nameLineHeight,
    font: 'bold',
    maxLines: row.nameLines,
  });
  const doseY = name.bottom - 2;
  const dose = drawWrapped(page, compactPatientPlanDose(exercise), x, doseY, 285, {
    size: doseSize,
    lineHeight: doseLineHeight,
    maxLines: row.doseLines,
  });
  const rest = drawWrapped(page, `Descanso: ${exercise.rest}`, A4_WIDTH - MARGIN - 155, doseY, 155, {
    size: doseSize - 0.5,
    lineHeight: doseLineHeight,
    color: MUTED,
    maxLines: row.restLines,
  });
  drawWrapped(page, `Clave: ${cue}`, x, Math.min(dose.bottom, rest.bottom) - 2, A4_WIDTH - MARGIN - x, {
    size: cueSize,
    lineHeight: cueLineHeight,
    color: MUTED,
    maxLines: row.cueLines,
  });
  page.drawLine({ x1: MARGIN, y1: top - row.height, x2: A4_WIDTH - MARGIN, y2: top - row.height, stroke: SOFT_RULE, lineWidth: 0.5 });
}

function drawFinalPlanDetails(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  top: number,
  extraLarge: boolean,
) {
  const safetyTop = Math.max(96, top - 6);
  page.drawLine({ x1: MARGIN, y1: safetyTop, x2: MARGIN, y2: safetyTop - 35, stroke: INK, lineWidth: 1.6 });
  page.drawText('Seguridad', { x: MARGIN + 14, y: safetyTop - 10, size: extraLarge ? 11.5 : 10.5, font: 'bold', color: INK });
  drawWrapped(page, 'Detén el ejercicio y contacta con tu fisioterapeuta si aparece dolor fuerte, mareo o un síntoma distinto del esperado.', MARGIN + 14, safetyTop - 26, A4_WIDTH - MARGIN * 2 - 14, {
    size: extraLarge ? 11.2 : 10.2,
    lineHeight: extraLarge ? 15 : 13.5,
    color: MUTED,
    maxLines: 2,
  });

  const professionalY = Math.max(49, safetyTop - 53);
  drawWrapped(page, `Profesional responsable: ${documentModel.professional.name} · ${documentModel.professional.specialty}`, MARGIN, professionalY, 305, {
    size: 8.5,
    font: 'bold',
    color: CHARCOAL,
    maxLines: 1,
  });
  page.drawText('Próxima revisión:', { x: 365, y: professionalY, size: 8.5, font: 'bold', color: CHARCOAL });
  page.drawLine({ x1: 445, y1: professionalY - 2, x2: A4_WIDTH - MARGIN, y2: professionalY - 2, stroke: RULE, lineWidth: 0.7 });
}

function drawPlanFirstPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  layoutPage: PatientPlanLayoutPage,
  options: PatientPlanDeliveryOptions,
  pageNumber: number,
  totalPages: number,
) {
  const extraLarge = options.fontScale === 'extra-large';
  const header = measurePatientPlanFirstPageHeader(documentModel, options.fontScale);
  drawDocumentHeader(page, 'PLAN PERSONAL DE REHABILITACIÓN', pageNumber, totalPages);
  const status = patientPlanStatusLabel(documentModel.plan.status);
  page.drawText('PACIENTE', { x: MARGIN, y: 744, size: 9.5, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.patient.name, MARGIN, header.patientNameY, 395, {
    size: extraLarge ? 27 : 24,
    lineHeight: extraLarge ? 31 : 28,
    font: 'bold',
    maxLines: header.patientNameLines,
  });
  page.drawText(`PLAN ${status.toUpperCase()}`, { x: A4_WIDTH - MARGIN - 104, y: 716, size: 9.5, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.title, MARGIN, header.planTitleY, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 18 : 16,
    lineHeight: extraLarge ? 22 : 20,
    font: 'bold',
    color: CHARCOAL,
    maxLines: header.planTitleLines,
  });
  drawWrapped(page, `${documentModel.patient.diagnosis} · ${documentModel.patient.affectedArea}`, MARGIN, header.diagnosisY, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 12.5 : 11.3,
    lineHeight: extraLarge ? 16 : 14,
    color: MUTED,
    maxLines: header.diagnosisLines,
  });
  page.drawLine({ x1: MARGIN, y1: header.separatorY, x2: A4_WIDTH - MARGIN, y2: header.separatorY, stroke: SOFT_RULE, lineWidth: 0.6 });

  page.drawText('FRECUENCIA INDICADA', { x: MARGIN, y: header.frequencyLabelY, size: 9.2, font: 'bold', color: MUTED });
  page.drawText('DURACIÓN DEL PLAN', { x: 332, y: header.frequencyLabelY, size: 9.2, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.frequency, MARGIN, header.frequencyY, 235, {
    size: extraLarge ? 15 : 13.5,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    maxLines: header.frequencyLines,
  });
  drawWrapped(page, documentModel.plan.duration, 332, header.durationY, 220, {
    size: extraLarge ? 15 : 13.5,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    maxLines: header.durationLines,
  });

  page.drawText('OBJETIVO TERAPÉUTICO', { x: MARGIN, y: header.objectiveLabelY, size: 9.2, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.objective, MARGIN, header.objectiveY, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 14.5 : 12.8,
    lineHeight: extraLarge ? 18 : 16,
    maxLines: header.objectiveLines,
  });
  page.drawText('EJERCICIOS PRESCRITOS', { x: MARGIN, y: header.exercisesLabelY, size: 9.3, font: 'bold', color: MUTED });

  let top = header.rowsTop;
  layoutPage.rows.forEach((row) => {
    drawPlanExerciseRow(page, row, top, extraLarge);
    top -= row.height;
  });
  if (!layoutPage.rows.length) {
    page.drawText('Los ejercicios continúan en la página siguiente.', {
      x: MARGIN,
      y: Math.max(62, header.rowsTop - 8),
      size: 9.5,
      font: 'bold',
      color: MUTED,
    });
  }
  if (layoutPage.final) drawFinalPlanDetails(page, documentModel, top, extraLarge);
  drawFooter(page, documentModel);
}

function drawPlanContinuationPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  layoutPage: PatientPlanLayoutPage,
  options: PatientPlanDeliveryOptions,
  pageNumber: number,
  totalPages: number,
) {
  const extraLarge = options.fontScale === 'extra-large';
  drawDocumentHeader(page, 'PLAN PERSONAL DE REHABILITACIÓN', pageNumber, totalPages);
  drawWrapped(page, documentModel.patient.name, MARGIN, 744, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 22 : 19,
    lineHeight: extraLarge ? 26 : 23,
    font: 'bold',
    maxLines: 2,
  });
  const firstOrder = layoutPage.rows[0]?.exercise.order ?? '';
  drawWrapped(page, `${documentModel.plan.title} · ejercicios ${firstOrder} en adelante`, MARGIN, 697, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 14.5 : 13,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    color: MUTED,
    maxLines: 2,
  });
  page.drawText('EJERCICIOS PRESCRITOS', { x: MARGIN, y: 651, size: 9.3, font: 'bold', color: MUTED });

  let top = 634;
  layoutPage.rows.forEach((row) => {
    drawPlanExerciseRow(page, row, top, extraLarge);
    top -= row.height;
  });
  if (layoutPage.final) drawFinalPlanDetails(page, documentModel, top, extraLarge);
  drawFooter(page, documentModel);
}

function drawLogExerciseRow(
  page: LocalPdfPage,
  row: PatientLogMeasuredRow,
  top: number,
  columns: number[],
  tableX: number,
  tableWidth: number,
  extraLarge: boolean,
) {
  const exercise = row.exercise;
  const bottom = top - row.height;
  page.strokeRect({ x: tableX, y: bottom, width: tableWidth, height: row.height, stroke: SOFT_RULE, lineWidth: 0.6 });
  columns.slice(1, -1).forEach((x) => page.drawLine({ x1: x, y1: bottom, x2: x, y2: top, stroke: SOFT_RULE, lineWidth: 0.5 }));
  page.drawText(String(exercise.order).padStart(2, '0'), { x: tableX + 7, y: bottom + row.height / 2 - 4, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
  const textTop = top - 14;
  drawWrapped(page, exercise.name, tableX + 31, textTop, 154 - 39, {
    size: extraLarge ? 11 : 9.8,
    lineHeight: extraLarge ? 13.5 : 12,
    font: 'bold',
    maxLines: row.nameLines,
  });
  drawWrapped(page, compactPatientPlanDose(exercise), columns[1] + 8, textTop, 127 - 16, {
    size: extraLarge ? 10 : 9,
    lineHeight: extraLarge ? 12.5 : 11,
    maxLines: row.doseLines,
  });
  drawBlankField(page, columns[2] + 8, bottom + 9, 174 - 16, row.height - 18);
  const discomfortWidth = tableWidth - 154 - 127 - 174;
  drawBlankField(page, columns[3] + 7, bottom + row.height / 2 - 10, Math.max(20, discomfortWidth - 35), 20);
  page.drawText('/10', { x: tableX + tableWidth - 25, y: bottom + row.height / 2 - 3, size: 8.8, color: MUTED });
}

function drawLogPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  layoutPage: PatientLogLayoutPage,
  options: PatientPlanDeliveryOptions,
  sessionNumber: number,
  pageNumber: number,
  totalPages: number,
) {
  const extraLarge = options.fontScale === 'extra-large';
  drawDocumentHeader(page, 'REGISTRO INDIVIDUAL DE SESIÓN', pageNumber, totalPages);
  drawWrapped(page, documentModel.patient.name, MARGIN, 744, 315, {
    size: extraLarge ? 22 : 20,
    lineHeight: extraLarge ? 26 : 23,
    font: 'bold',
    maxLines: 2,
  });
  drawWrapped(page, documentModel.plan.title, 350, 744, 207, {
    size: extraLarge ? 11.5 : 10.5,
    lineHeight: extraLarge ? 14 : 13,
    font: 'bold',
    color: MUTED,
    maxLines: 3,
  });
  page.drawText(layoutPage.continuation ? `SESIÓN ${sessionNumber} · CONTINUACIÓN` : `SESIÓN ${sessionNumber}`, {
    x: MARGIN,
    y: 686,
    size: extraLarge ? 15 : 13.5,
    font: 'bold',
    color: CHARCOAL,
  });
  page.drawText('Una hoja clara para registrar lo que realmente se completó.', { x: 210, y: 686, size: extraLarge ? 10.7 : 9.7, color: MUTED });

  page.drawText('Fecha', { x: MARGIN, y: 655, size: 9.2, font: 'bold', color: MUTED });
  drawBlankField(page, MARGIN, 625, 122, 22);
  page.drawText('Dolor antes', { x: 185, y: 655, size: 9.2, font: 'bold', color: MUTED });
  drawBlankField(page, 185, 625, 58, 22);
  page.drawText('/10', { x: 248, y: 632, size: 9.5, color: MUTED });
  page.drawText('Dolor después', { x: 292, y: 655, size: 9.2, font: 'bold', color: MUTED });
  drawBlankField(page, 292, 625, 58, 22);
  page.drawText('/10', { x: 355, y: 632, size: 9.5, color: MUTED });
  page.drawText('Resultado real: 10 / 10 / 8 · 30 s / 25 s / 20 s · 12 min · no realizado', {
    x: MARGIN,
    y: 596,
    size: extraLarge ? 9.8 : 8.9,
    color: MUTED,
  });

  const tableX = MARGIN;
  const tableTop = 577;
  const tableWidth = A4_WIDTH - MARGIN * 2;
  const exerciseWidth = 154;
  const indicatedWidth = 127;
  const resultWidth = 174;
  const headerHeight = 31;
  page.drawRect({ x: tableX, y: tableTop - headerHeight, width: tableWidth, height: headerHeight, fill: TINT });
  page.strokeRect({ x: tableX, y: tableTop - headerHeight, width: tableWidth, height: headerHeight, stroke: CHARCOAL, lineWidth: 0.8 });
  const columns = [tableX, tableX + exerciseWidth, tableX + exerciseWidth + indicatedWidth, tableX + exerciseWidth + indicatedWidth + resultWidth, tableX + tableWidth];
  columns.slice(1, -1).forEach((x) => page.drawLine({ x1: x, y1: tableTop - headerHeight, x2: x, y2: tableTop, stroke: SOFT_RULE, lineWidth: 0.5 }));
  page.drawText('Ejercicio', { x: tableX + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Indicado', { x: columns[1] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Resultado real', { x: columns[2] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Molestia', { x: columns[3] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });

  let currentTop = tableTop - headerHeight;
  layoutPage.rows.forEach((row) => {
    drawLogExerciseRow(page, row, currentTop, columns, tableX, tableWidth, extraLarge);
    currentTop -= row.height;
  });

  if (layoutPage.final) {
    const outcomeY = currentTop - 24;
    page.drawText('Resultado de la sesión', { x: MARGIN, y: outcomeY, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    drawCheckbox(page, MARGIN, outcomeY - 15, 'Completa', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    drawCheckbox(page, MARGIN + 116, outcomeY - 15, 'Parcial', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    drawCheckbox(page, MARGIN + 216, outcomeY - 15, 'Suspendida', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    page.drawText('Esfuerzo', { x: 340, y: outcomeY, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    drawCheckbox(page, 340, outcomeY - 15, 'Suave', extraLarge ? 16 : 14, extraLarge ? 10.5 : 9.8);
    drawCheckbox(page, 414, outcomeY - 15, 'Adecuado', extraLarge ? 16 : 14, extraLarge ? 10.5 : 9.8);
    drawCheckbox(page, 492, outcomeY - 15, 'Intenso', extraLarge ? 16 : 14, extraLarge ? 10.5 : 9.8);

    const notesTop = outcomeY - 53;
    page.drawText('Observaciones', { x: MARGIN, y: notesTop, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    const notesBottom = FOOTER_Y + 33;
    page.strokeRect({ x: MARGIN, y: notesBottom, width: A4_WIDTH - MARGIN * 2, height: Math.max(38, notesTop - notesBottom - 8), stroke: RULE, lineWidth: 0.7 });
  } else {
    page.drawText(`Continúa la sesión ${sessionNumber} en la página siguiente.`, { x: MARGIN, y: currentTop - 28, size: 9.5, font: 'bold', color: MUTED });
  }
  drawFooter(page, documentModel);
}

export function renderUniversalPatientPlanPdf(
  documentModel: PatientPlanDocument,
  input: PatientPlanDeliveryOptions,
): PatientPlanPdfResult {
  const options = normalizePatientPlanDeliveryOptions(input);
  if (options.mode === 'detailed') throw new Error('El formato detallado usa su renderizador clínico dedicado.');
  const estimate = estimatePatientPlanPages(documentModel, options);
  const pdf = new LocalPdfDocument({
    title: `${documentModel.plan.title} - ${documentModel.patient.name}`,
    author: documentModel.professional.name,
    subject: options.mode === 'plan-and-log' ? 'Plan y registro de rehabilitación' : options.mode === 'plan-only' ? 'Plan de rehabilitación' : 'Registro de rehabilitación',
    createdAt: documentModel.generatedAt,
  });

  const includesPlan = options.mode === 'plan-and-log' || options.mode === 'plan-only';
  const includesLog = options.mode === 'plan-and-log' || options.mode === 'log-only';
  const planLayout = includesPlan ? layoutPatientPlanPages(documentModel, options.fontScale) : [];
  const logLayout = includesLog ? layoutPatientLogPages(documentModel, options.fontScale) : [];
  let pageNumber = 0;

  planLayout.forEach((layoutPage) => {
    pageNumber += 1;
    if (layoutPage.continuation) drawPlanContinuationPage(pdf.addPage(), documentModel, layoutPage, options, pageNumber, estimate.pageCount);
    else drawPlanFirstPage(pdf.addPage(), documentModel, layoutPage, options, pageNumber, estimate.pageCount);
  });

  if (includesLog) {
    for (let sessionNumber = 1; sessionNumber <= options.sessionCount; sessionNumber += 1) {
      logLayout.forEach((layoutPage) => {
        pageNumber += 1;
        drawLogPage(pdf.addPage(), documentModel, layoutPage, options, sessionNumber, pageNumber, estimate.pageCount);
      });
    }
  }

  return {
    bytes: pdf.save(),
    filename: patientPlanFilename(documentModel),
    mimeType: 'application/pdf',
    pageCount: pdf.pageCount,
    omittedMedia: [],
  };
}
