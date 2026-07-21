import { patientPlanFilename } from './deliveryActions';
import {
  estimatePatientPlanPages,
  normalizePatientPlanDeliveryOptions,
  patientSessionPageCapacities,
} from './deliveryOptions';
import { A4_HEIGHT, A4_WIDTH, LocalPdfDocument, type LocalPdfPage, type PdfColor, wrapPdfText } from './pdfWriter';
import type { PatientPlanDeliveryOptions, PatientPlanDocument, PatientPlanDocumentExercise, PatientPlanPdfResult } from './types';
import { patientPlanStatusLabel } from './buildPatientPlanDocument';

const GREEN: PdfColor = [0.494, 0.714, 0.584];
const GREEN_DARK: PdfColor = [0.196, 0.353, 0.275];
const GREEN_SOFT: PdfColor = [0.925, 0.961, 0.941];
const INK: PdfColor = [0.102, 0.125, 0.114];
const MUTED: PdfColor = [0.28, 0.32, 0.3];
const LINE: PdfColor = [0.76, 0.81, 0.78];
const PAPER: PdfColor = [1, 1, 1];
const WARM: PdfColor = [0.965, 0.91, 0.76];
const WARM_INK: PdfColor = [0.45, 0.32, 0.08];
const MARGIN = 34;

function drawWrapped(
  page: LocalPdfPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  lineHeight: number,
  options: { font?: 'regular' | 'bold'; color?: PdfColor; maxLines?: number } = {},
) {
  const lines = wrapPdfText(text, width, size, options.font ?? 'regular');
  const visible = options.maxLines ? lines.slice(0, options.maxLines) : lines;
  visible.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font: options.font, color: options.color ?? INK }));
  return y - visible.length * lineHeight;
}

function exerciseDose(exercise: PatientPlanDocumentExercise, includeRest: boolean) {
  const work = exercise.repetitions && exercise.repetitions > 0
    ? `${exercise.repetitions} repeticiones`
    : exercise.duration || 'tiempo indicado';
  return `${exercise.sets} series × ${work}${includeRest ? ` · descanso ${exercise.rest}` : ''}`;
}

function drawHeader(page: LocalPdfPage, documentModel: PatientPlanDocument, subtitle: string, base: number) {
  page.drawRect({ x: 0, y: A4_HEIGHT - 58, width: A4_WIDTH, height: 58, fill: GREEN });
  page.drawText('Atal', { x: MARGIN, y: A4_HEIGHT - 38, size: 23, font: 'bold', color: PAPER });
  page.drawText(subtitle, { x: 108, y: A4_HEIGHT - 33, size: Math.max(12, base - 1), font: 'bold', color: PAPER });
  page.drawText(documentModel.professional.clinic, { x: A4_WIDTH - MARGIN - 150, y: A4_HEIGHT - 34, size: 10.5, color: PAPER });
}

function drawFooter(page: LocalPdfPage, documentModel: PatientPlanDocument, number: number, total: number) {
  page.drawLine({ x1: MARGIN, y1: 52, x2: A4_WIDTH - MARGIN, y2: 52, stroke: LINE, lineWidth: 0.9 });
  page.drawText(`${documentModel.patient.name} · ${documentModel.plan.title}`, { x: MARGIN, y: 35, size: 11, color: MUTED });
  page.drawText(`Página ${number} de ${total}`, { x: A4_WIDTH - MARGIN - 82, y: 35, size: 11, font: 'bold', color: MUTED });
  page.drawText('Lleva este registro a tu siguiente cita de rehabilitación.', { x: MARGIN, y: 18, size: 11, color: MUTED });
}

function drawCheckbox(page: LocalPdfPage, x: number, y: number, label: string, size: number, fontSize: number) {
  page.strokeRect({ x, y: y - size + 2, width: size, height: size, stroke: GREEN_DARK, lineWidth: 1.1 });
  page.drawText(label, { x: x + size + 7, y: y - size + 3, size: fontSize, color: INK });
}

function drawBlankField(page: LocalPdfPage, x: number, y: number, label: string, width: number, base: number, suffix = '') {
  page.drawText(label, { x, y, size: base, font: 'bold', color: INK });
  const labelWidth = label.length * Math.max(7, base * 0.52);
  const lineStart = x + Math.min(width - 28, labelWidth + 9);
  page.drawLine({ x1: lineStart, y1: y - 2, x2: x + width - (suffix ? 33 : 0), y2: y - 2, stroke: MUTED, lineWidth: 0.8 });
  if (suffix) page.drawText(suffix, { x: x + width - 30, y, size: base, color: MUTED });
}

function drawExerciseLegend(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  options: PatientPlanDeliveryOptions,
  startY: number,
  base: number,
) {
  if (!options.includeExercises) return startY;
  page.drawText('Ejercicios del plan', { x: MARGIN, y: startY, size: base + 1, font: 'bold', color: INK });
  const rowHeight = options.fontScale === 'extra-large' ? 44 : 40;
  documentModel.exercises.forEach((exercise, index) => {
    const y = startY - 28 - index * rowHeight;
    page.drawRect({ x: MARGIN, y: y - rowHeight + 8, width: 40, height: rowHeight - 6, fill: GREEN_SOFT });
    page.drawText(String(exercise.order).padStart(2, '0'), { x: MARGIN + 9, y: y - 12, size: base, font: 'bold', color: GREEN_DARK });
    page.drawText(exercise.name, { x: MARGIN + 52, y: y - 5, size: base, font: 'bold', color: INK });
    drawWrapped(page, exerciseDose(exercise, options.includeRest), MARGIN + 52, y - 23, A4_WIDTH - MARGIN * 2 - 56, base, base + 2, { color: MUTED, maxLines: 1 });
  });
  return startY - 34 - documentModel.exercises.length * rowHeight;
}

function drawSessionCard(
  page: LocalPdfPage,
  documentModel: PatientPlanDocument,
  options: PatientPlanDeliveryOptions,
  sessionNumber: number,
  top: number,
  height: number,
  base: number,
) {
  const x = MARGIN;
  const width = A4_WIDTH - MARGIN * 2;
  const bottom = top - height;
  const boxSize = options.fontScale === 'extra-large' ? 18 : 16;
  page.strokeRect({ x, y: bottom, width, height, stroke: LINE, lineWidth: 1 });
  page.drawRect({ x, y: top - 42, width, height: 42, fill: GREEN_SOFT });
  page.drawText(`SESIÓN ${sessionNumber}`, { x: x + 14, y: top - 29, size: base + 1, font: 'bold', color: GREEN_DARK });

  if (options.logFields.date) drawBlankField(page, x + 132, top - 28, 'Fecha:', 180, base);
  if (options.logFields.overallCompletion) drawCheckbox(page, x + width - 198, top - 18, 'Rutina completada', boxSize, base);

  let y = top - 68;
  if (options.logFields.painBefore || options.logFields.painAfter) {
    if (options.logFields.painBefore) drawBlankField(page, x + 14, y, 'Dolor antes:', 230, base, '/10');
    if (options.logFields.painAfter) drawBlankField(page, x + 278, y, 'Dolor después:', 230, base, '/10');
    y -= options.fontScale === 'extra-large' ? 34 : 30;
  }

  if (options.logFields.difficulty) {
    page.drawText('Dificultad percibida:', { x: x + 14, y, size: base, font: 'bold', color: INK });
    const checkboxY = y + 9;
    drawCheckbox(page, x + 178, checkboxY, 'Fácil', boxSize, base);
    drawCheckbox(page, x + 285, checkboxY, 'Bien', boxSize, base);
    drawCheckbox(page, x + 384, checkboxY, 'Difícil', boxSize, base);
    y -= options.fontScale === 'extra-large' ? 36 : 32;
  }

  if (options.logFields.perExerciseCompletion) {
    page.drawText('Ejercicios realizados:', { x: x + 14, y, size: base, font: 'bold', color: INK });
    y -= options.fontScale === 'extra-large' ? 26 : 23;
    documentModel.exercises.forEach((exercise, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const lineHeight = options.fontScale === 'extra-large' ? 26 : 22;
      const checkboxY = y - row * lineHeight;
      drawCheckbox(page, x + 18 + column * 82, checkboxY, String(exercise.order).padStart(2, '0'), boxSize, base);
    });
    y -= Math.max(1, Math.ceil(documentModel.exercises.length / 6)) * (options.fontScale === 'extra-large' ? 26 : 22) + 2;
  }

  if (options.logFields.notes) {
    page.drawText('Observaciones:', { x: x + 14, y, size: base, font: 'bold', color: INK });
    const firstLine = y - 18;
    page.drawLine({ x1: x + 14, y1: firstLine, x2: x + width - 16, y2: firstLine, stroke: MUTED, lineWidth: 0.7 });
    if (firstLine - 22 > bottom + 12) page.drawLine({ x1: x + 14, y1: firstLine - 22, x2: x + width - 16, y2: firstLine - 22, stroke: LINE, lineWidth: 0.7 });
  }
}

export function renderPatientSessionLogPdf(
  documentModel: PatientPlanDocument,
  input: PatientPlanDeliveryOptions,
): PatientPlanPdfResult {
  const options = normalizePatientPlanDeliveryOptions({ ...input, mode: 'session-log' });
  const base = options.fontScale === 'extra-large' ? 16 : 14;
  const title = options.fontScale === 'extra-large' ? 27 : 24;
  const capacities = patientSessionPageCapacities(documentModel, options);
  const estimate = estimatePatientPlanPages(documentModel, options);
  const pdf = new LocalPdfDocument({
    title: `Registro de rehabilitación - ${documentModel.patient.name}`,
    author: documentModel.professional.name,
    subject: `Registro de ${options.sessionCount} sesiones de rehabilitación`,
    createdAt: documentModel.generatedAt,
  });

  let nextSession = 1;
  for (let pageIndex = 0; pageIndex < estimate.pageCount; pageIndex += 1) {
    const page = pdf.addPage();
    drawHeader(page, documentModel, pageIndex === 0 ? 'REGISTRO DE REHABILITACIÓN' : 'REGISTRO · CONTINUACIÓN', base);
    let top = 742;

    if (pageIndex === 0) {
      const status = patientPlanStatusLabel(documentModel.plan.status);
      const active = documentModel.plan.status === 'active';
      page.drawRect({ x: MARGIN, y: 707, width: active ? 94 : 142, height: 27, fill: active ? GREEN_SOFT : WARM });
      page.drawText(`ESTADO: ${status.toUpperCase()}`, { x: MARGIN + 10, y: 716, size: 10.5, font: 'bold', color: active ? GREEN_DARK : WARM_INK });
      page.drawText(documentModel.patient.name, { x: MARGIN, y: 675, size: title, font: 'bold', color: INK });
      page.drawText(documentModel.plan.title, { x: MARGIN, y: 645, size: base + 3, font: 'bold', color: GREEN_DARK });
      page.drawText(`${options.sessionCount} sesiones para registrar · ${documentModel.plan.frequency}`, { x: MARGIN, y: 619, size: base, color: MUTED });
      top = drawExerciseLegend(page, documentModel, options, 586, base) - 10;
    } else {
      page.drawText(documentModel.patient.name, { x: MARGIN, y: 741, size: title - 3, font: 'bold', color: INK });
      page.drawText(`${documentModel.plan.title} · desde la sesión ${nextSession}`, { x: MARGIN, y: 714, size: base + 1, font: 'bold', color: GREEN_DARK });
      top = 686;
    }

    const capacity = pageIndex === 0 ? capacities.first : capacities.continuation;
    const remaining = options.sessionCount - nextSession + 1;
    const count = Math.max(0, Math.min(capacity, remaining));
    for (let index = 0; index < count; index += 1) {
      drawSessionCard(page, documentModel, options, nextSession, top - index * capacities.rowHeight, capacities.rowHeight - 8, base);
      nextSession += 1;
    }

    drawFooter(page, documentModel, pageIndex + 1, estimate.pageCount);
  }

  return {
    bytes: pdf.save(),
    filename: patientPlanFilename(documentModel).replace('atal-plan-', 'atal-registro-'),
    mimeType: 'application/pdf',
    pageCount: pdf.pageCount,
    omittedMedia: [],
  };
}
