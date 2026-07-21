import { patientPlanFilename } from './deliveryActions';
import {
  estimatePatientPlanPages,
  normalizePatientPlanDeliveryOptions,
  patientLogExerciseCapacity,
  patientPlanExerciseCapacities,
} from './deliveryOptions';
import { A4_HEIGHT, A4_WIDTH, LocalPdfDocument, type LocalPdfPage, type PdfColor, wrapPdfText } from './pdfWriter';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanDocumentExercise,
  PatientPlanPdfResult,
} from './types';
import { patientPlanStatusLabel } from './buildPatientPlanDocument';

const INK: PdfColor = [0.067, 0.067, 0.067];
const CHARCOAL: PdfColor = [0.2, 0.2, 0.2];
const MUTED: PdfColor = [0.4, 0.4, 0.4];
const RULE: PdfColor = [0.74, 0.74, 0.74];
const SOFT_RULE: PdfColor = [0.88, 0.88, 0.88];
const TINT: PdfColor = [0.965, 0.965, 0.955];
const PAPER: PdfColor = [1, 1, 1];
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
  page.drawText(documentModel.patient.name, { x: MARGIN, y: FOOTER_Y + 2, size: 8.5, color: MUTED });
  page.drawText(documentModel.professional.clinic, { x: A4_WIDTH - MARGIN - 160, y: FOOTER_Y + 2, size: 8.5, color: MUTED });
}

function drawCheckbox(page: LocalPdfPage, x: number, y: number, label: string, size: number, fontSize: number) {
  page.strokeRect({ x, y: y - size + 2, width: size, height: size, stroke: CHARCOAL, lineWidth: 0.9 });
  page.drawText(label, { x: x + size + 6, y: y - size + 4, size: fontSize, color: INK });
}

function compactDose(exercise: PatientPlanDocumentExercise) {
  const dose = exercise.doseLabel.replace(/\s*·\s*descanso.*$/i, '').trim();
  return dose || exercise.doseLabel;
}

function drawPlanExerciseRow(
  page: LocalPdfPage,
  exercise: PatientPlanDocumentExercise,
  top: number,
  height: number,
  extraLarge: boolean,
) {
  page.drawRect({ x: MARGIN, y: top - height + 5, width: 42, height: height - 10, fill: TINT });
  page.drawText(String(exercise.order).padStart(2, '0'), {
    x: MARGIN + 11,
    y: top - height / 2 - 2,
    size: extraLarge ? 13 : 11.5,
    font: 'bold',
    color: CHARCOAL,
  });

  const x = MARGIN + 57;
  const nameSize = extraLarge ? 15 : 13.5;
  const name = drawWrapped(page, exercise.name, x, top - 17, A4_WIDTH - MARGIN - x, {
    size: nameSize,
    lineHeight: nameSize + 3,
    font: 'bold',
    maxLines: 2,
  });
  const doseY = top - 40 - Math.max(0, name.lines - 1) * (nameSize + 3);
  drawWrapped(page, compactDose(exercise), x, doseY, 320, {
    size: extraLarge ? 12.5 : 11.3,
    lineHeight: extraLarge ? 15 : 13.5,
    maxLines: 2,
  });
  page.drawText(`Descanso: ${exercise.rest}`, {
    x: A4_WIDTH - MARGIN - 155,
    y: doseY,
    size: extraLarge ? 11.7 : 10.8,
    color: MUTED,
  });
  drawWrapped(page, `Clave: ${exercise.therapistNotes || exercise.objective}`, x, doseY - 20, A4_WIDTH - MARGIN - x, {
    size: extraLarge ? 11.5 : 10.3,
    lineHeight: extraLarge ? 14.5 : 13,
    color: MUTED,
    maxLines: 2,
  });
  page.drawLine({ x1: MARGIN, y1: top - height, x2: A4_WIDTH - MARGIN, y2: top - height, stroke: SOFT_RULE, lineWidth: 0.5 });
}

function drawPlanFirstPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  exercises: PatientPlanDocumentExercise[],
  options: PatientPlanDeliveryOptions,
  pageNumber: number,
  totalPages: number,
  finalPlanPage: boolean,
) {
  const extraLarge = options.fontScale === 'extra-large';
  drawDocumentHeader(page, 'PLAN PERSONAL DE REHABILITACIÓN', pageNumber, totalPages);
  const status = patientPlanStatusLabel(documentModel.plan.status);
  page.drawText('PACIENTE', { x: MARGIN, y: 744, size: 9.5, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.patient.name, MARGIN, 714, 420, {
    size: extraLarge ? 27 : 24,
    lineHeight: extraLarge ? 31 : 28,
    font: 'bold',
    maxLines: 2,
  });
  page.drawText(`PLAN ${status.toUpperCase()}`, { x: A4_WIDTH - MARGIN - 104, y: 716, size: 9.5, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.title, MARGIN, 653, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 18 : 16,
    lineHeight: extraLarge ? 22 : 20,
    font: 'bold',
    color: CHARCOAL,
    maxLines: 2,
  });
  drawWrapped(page, `${documentModel.patient.diagnosis} · ${documentModel.patient.affectedArea}`, MARGIN, 607, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 12.5 : 11.3,
    lineHeight: extraLarge ? 16 : 14,
    color: MUTED,
    maxLines: 2,
  });
  page.drawLine({ x1: MARGIN, y1: 573, x2: A4_WIDTH - MARGIN, y2: 573, stroke: SOFT_RULE, lineWidth: 0.6 });

  page.drawText('FRECUENCIA INDICADA', { x: MARGIN, y: 548, size: 9.2, font: 'bold', color: MUTED });
  page.drawText('DURACIÓN DEL PLAN', { x: 332, y: 548, size: 9.2, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.frequency, MARGIN, 526, 235, {
    size: extraLarge ? 15 : 13.5,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    maxLines: 2,
  });
  drawWrapped(page, documentModel.plan.duration, 332, 526, 220, {
    size: extraLarge ? 15 : 13.5,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    maxLines: 2,
  });

  page.drawText('OBJETIVO TERAPÉUTICO', { x: MARGIN, y: 481, size: 9.2, font: 'bold', color: MUTED });
  drawWrapped(page, documentModel.plan.objective, MARGIN, 458, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 14.5 : 12.8,
    lineHeight: extraLarge ? 18 : 16,
    maxLines: 3,
  });
  page.drawText('EJERCICIOS PRESCRITOS', { x: MARGIN, y: 397, size: 9.3, font: 'bold', color: MUTED });

  const rowHeight = extraLarge ? 82 : 70;
  let top = 380;
  exercises.forEach((exercise) => {
    drawPlanExerciseRow(page, exercise, top, rowHeight, extraLarge);
    top -= rowHeight;
  });

  if (finalPlanPage) {
    const safetyTop = Math.max(93, top - 8);
    page.drawLine({ x1: MARGIN, y1: safetyTop, x2: MARGIN, y2: safetyTop - 37, stroke: INK, lineWidth: 1.6 });
    page.drawText('Seguridad', { x: MARGIN + 14, y: safetyTop - 11, size: extraLarge ? 11.5 : 10.5, font: 'bold', color: INK });
    drawWrapped(page, 'Detén el ejercicio y contacta con tu fisioterapeuta si aparece dolor fuerte, mareo o un síntoma distinto del esperado.', MARGIN + 14, safetyTop - 27, A4_WIDTH - MARGIN * 2 - 14, {
      size: extraLarge ? 11.2 : 10.2,
      lineHeight: extraLarge ? 15 : 13.5,
      color: MUTED,
      maxLines: 2,
    });
  }
  drawFooter(page, documentModel);
}

function drawPlanContinuationPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  exercises: PatientPlanDocumentExercise[],
  options: PatientPlanDeliveryOptions,
  pageNumber: number,
  totalPages: number,
  finalPlanPage: boolean,
) {
  const extraLarge = options.fontScale === 'extra-large';
  drawDocumentHeader(page, 'PLAN PERSONAL DE REHABILITACIÓN', pageNumber, totalPages);
  drawWrapped(page, documentModel.patient.name, MARGIN, 744, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 22 : 19,
    lineHeight: extraLarge ? 26 : 23,
    font: 'bold',
    maxLines: 2,
  });
  drawWrapped(page, `${documentModel.plan.title} · ejercicios ${exercises[0]?.order ?? ''} en adelante`, MARGIN, 697, A4_WIDTH - MARGIN * 2, {
    size: extraLarge ? 14.5 : 13,
    lineHeight: extraLarge ? 18 : 16,
    font: 'bold',
    color: MUTED,
    maxLines: 2,
  });
  page.drawText('EJERCICIOS PRESCRITOS', { x: MARGIN, y: 651, size: 9.3, font: 'bold', color: MUTED });
  const rowHeight = extraLarge ? 82 : 70;
  let top = 634;
  exercises.forEach((exercise) => {
    drawPlanExerciseRow(page, exercise, top, rowHeight, extraLarge);
    top -= rowHeight;
  });

  if (finalPlanPage) {
    const safetyTop = Math.max(93, top - 8);
    page.drawLine({ x1: MARGIN, y1: safetyTop, x2: MARGIN, y2: safetyTop - 37, stroke: INK, lineWidth: 1.6 });
    page.drawText('Seguridad', { x: MARGIN + 14, y: safetyTop - 11, size: extraLarge ? 11.5 : 10.5, font: 'bold', color: INK });
    drawWrapped(page, 'Detén el ejercicio y contacta con tu fisioterapeuta si aparece dolor fuerte, mareo o un síntoma distinto del esperado.', MARGIN + 14, safetyTop - 27, A4_WIDTH - MARGIN * 2 - 14, {
      size: extraLarge ? 11.2 : 10.2,
      lineHeight: extraLarge ? 15 : 13.5,
      color: MUTED,
      maxLines: 2,
    });
  }
  drawFooter(page, documentModel);
}

function drawBlankField(page: LocalPdfPage, x: number, y: number, width: number, height: number) {
  page.strokeRect({ x, y, width, height, stroke: RULE, lineWidth: 0.7 });
}

function drawLogPage(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  exercises: PatientPlanDocumentExercise[],
  options: PatientPlanDeliveryOptions,
  sessionNumber: number,
  part: number,
  logPagesPerSession: number,
  pageNumber: number,
  totalPages: number,
) {
  const extraLarge = options.fontScale === 'extra-large';
  const finalPart = part === logPagesPerSession - 1;
  drawDocumentHeader(page, 'REGISTRO INDIVIDUAL DE SESIÓN', pageNumber, totalPages);
  drawWrapped(page, documentModel.patient.name, MARGIN, 744, 330, {
    size: extraLarge ? 22 : 20,
    lineHeight: extraLarge ? 26 : 23,
    font: 'bold',
    maxLines: 2,
  });
  drawWrapped(page, documentModel.plan.title, 365, 744, 192, {
    size: extraLarge ? 11.5 : 10.5,
    lineHeight: extraLarge ? 14 : 13,
    font: 'bold',
    color: MUTED,
    maxLines: 3,
  });
  page.drawText(part === 0 ? `SESIÓN ${sessionNumber}` : `SESIÓN ${sessionNumber} · CONTINUACIÓN`, {
    x: MARGIN,
    y: 686,
    size: extraLarge ? 15 : 13.5,
    font: 'bold',
    color: CHARCOAL,
  });
  page.drawText('Una hoja clara para registrar lo que realmente se completó.', { x: 188, y: 686, size: extraLarge ? 10.7 : 9.7, color: MUTED });

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
  const discomfortWidth = tableWidth - exerciseWidth - indicatedWidth - resultWidth;
  const headerHeight = 31;
  const rowHeight = extraLarge ? 64 : 55;

  page.drawRect({ x: tableX, y: tableTop - headerHeight, width: tableWidth, height: headerHeight, fill: TINT });
  page.strokeRect({ x: tableX, y: tableTop - headerHeight, width: tableWidth, height: headerHeight, stroke: CHARCOAL, lineWidth: 0.8 });
  const columns = [tableX, tableX + exerciseWidth, tableX + exerciseWidth + indicatedWidth, tableX + exerciseWidth + indicatedWidth + resultWidth, tableX + tableWidth];
  columns.slice(1, -1).forEach((x) => page.drawLine({ x1: x, y1: tableTop - headerHeight, x2: x, y2: tableTop, stroke: SOFT_RULE, lineWidth: 0.5 }));
  page.drawText('Ejercicio', { x: tableX + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Indicado', { x: columns[1] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Resultado real', { x: columns[2] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });
  page.drawText('Molestia', { x: columns[3] + 8, y: tableTop - 20, size: extraLarge ? 9.5 : 8.6, font: 'bold', color: MUTED });

  let currentTop = tableTop - headerHeight;
  exercises.forEach((exercise) => {
    const bottom = currentTop - rowHeight;
    page.strokeRect({ x: tableX, y: bottom, width: tableWidth, height: rowHeight, stroke: SOFT_RULE, lineWidth: 0.6 });
    columns.slice(1, -1).forEach((x) => page.drawLine({ x1: x, y1: bottom, x2: x, y2: currentTop, stroke: SOFT_RULE, lineWidth: 0.5 }));
    page.drawText(String(exercise.order).padStart(2, '0'), { x: tableX + 7, y: bottom + rowHeight / 2 - 4, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    drawWrapped(page, exercise.name, tableX + 31, bottom + rowHeight / 2 + 8, exerciseWidth - 39, {
      size: extraLarge ? 11 : 9.8,
      lineHeight: extraLarge ? 13.5 : 12,
      font: 'bold',
      maxLines: 2,
    });
    drawWrapped(page, compactDose(exercise), columns[1] + 8, bottom + rowHeight / 2 + 8, indicatedWidth - 16, {
      size: extraLarge ? 10 : 9,
      lineHeight: extraLarge ? 12.5 : 11,
      maxLines: 2,
    });
    drawBlankField(page, columns[2] + 8, bottom + 9, resultWidth - 16, rowHeight - 18);
    drawBlankField(page, columns[3] + 7, bottom + rowHeight / 2 - 10, Math.max(20, discomfortWidth - 35), 20);
    page.drawText('/10', { x: tableX + tableWidth - 25, y: bottom + rowHeight / 2 - 3, size: 8.8, color: MUTED });
    currentTop = bottom;
  });

  if (finalPart) {
    const outcomeY = currentTop - 24;
    page.drawText('Resultado de la sesión', { x: MARGIN, y: outcomeY, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    drawCheckbox(page, MARGIN, outcomeY - 15, 'Completa', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    drawCheckbox(page, MARGIN + 116, outcomeY - 15, 'Parcial', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    drawCheckbox(page, MARGIN + 216, outcomeY - 15, 'Suspendida', extraLarge ? 16 : 14, extraLarge ? 11 : 10.2);
    page.drawText('Esfuerzo', { x: 370, y: outcomeY, size: extraLarge ? 10.5 : 9.5, font: 'bold', color: MUTED });
    drawCheckbox(page, 370, outcomeY - 15, 'Suave', extraLarge ? 16 : 14, extraLarge ? 10.5 : 9.8);
    drawCheckbox(page, 452, outcomeY - 15, 'Adecuado', extraLarge ? 16 : 14, extraLarge ? 10.5 : 9.8);

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
  let pageNumber = 0;

  if (includesPlan) {
    const capacities = patientPlanExerciseCapacities(options.fontScale);
    const firstExercises = documentModel.exercises.slice(0, capacities.first);
    pageNumber += 1;
    drawPlanFirstPage(pdf.addPage(), documentModel, firstExercises, options, pageNumber, estimate.pageCount, estimate.planPageCount === 1);
    let start = capacities.first;
    let planPart = 1;
    while (start < documentModel.exercises.length) {
      const exercises = documentModel.exercises.slice(start, start + capacities.continuation);
      planPart += 1;
      pageNumber += 1;
      drawPlanContinuationPage(pdf.addPage(), documentModel, exercises, options, pageNumber, estimate.pageCount, planPart === estimate.planPageCount);
      start += capacities.continuation;
    }
  }

  if (includesLog) {
    const logCapacity = patientLogExerciseCapacity(options.fontScale);
    const logPagesPerSession = estimate.logPagesPerSession;
    for (let sessionNumber = 1; sessionNumber <= options.sessionCount; sessionNumber += 1) {
      for (let part = 0; part < logPagesPerSession; part += 1) {
        const start = part * logCapacity;
        const exercises = documentModel.exercises.slice(start, start + logCapacity);
        pageNumber += 1;
        drawLogPage(pdf.addPage(), documentModel, exercises, options, sessionNumber, part, logPagesPerSession, pageNumber, estimate.pageCount);
      }
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
