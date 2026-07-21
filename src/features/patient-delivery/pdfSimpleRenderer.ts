import { patientPlanFilename } from './deliveryActions';
import { normalizePatientPlanDeliveryOptions, simpleExerciseRowsPerPage } from './deliveryOptions';
import { A4_HEIGHT, A4_WIDTH, LocalPdfDocument, type LocalPdfPage, type PdfColor, wrapPdfText } from './pdfWriter';
import type { PatientPlanDeliveryOptions, PatientPlanDocument, PatientPlanDocumentExercise, PatientPlanPdfResult } from './types';
import { patientPlanStatusLabel } from './buildPatientPlanDocument';

const GREEN: PdfColor = [0.494, 0.714, 0.584];
const GREEN_DARK: PdfColor = [0.196, 0.353, 0.275];
const GREEN_SOFT: PdfColor = [0.925, 0.961, 0.941];
const INK: PdfColor = [0.102, 0.125, 0.114];
const MUTED: PdfColor = [0.28, 0.32, 0.3];
const LINE: PdfColor = [0.82, 0.86, 0.84];
const PAPER: PdfColor = [1, 1, 1];
const WARM: PdfColor = [0.965, 0.91, 0.76];
const WARM_INK: PdfColor = [0.45, 0.32, 0.08];
const MARGIN = 38;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

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
    ? `${exercise.repetitions} ${exercise.repetitions === 1 ? 'repetición' : 'repeticiones'}`
    : exercise.duration || 'tiempo indicado';
  const rest = includeRest ? ` · descanso ${exercise.rest}` : '';
  return `${exercise.sets} ${exercise.sets === 1 ? 'serie' : 'series'} × ${work}${rest}`;
}

function drawHeader(page: LocalPdfPage, documentModel: PatientPlanDocument, pageTitle: string, base: number) {
  page.drawRect({ x: 0, y: A4_HEIGHT - 58, width: A4_WIDTH, height: 58, fill: GREEN });
  page.drawText('Atal', { x: MARGIN, y: A4_HEIGHT - 38, size: 23, font: 'bold', color: PAPER });
  page.drawText(pageTitle, { x: 114, y: A4_HEIGHT - 33, size: base - 2, font: 'bold', color: PAPER });
  page.drawText(documentModel.professional.clinic, { x: A4_WIDTH - MARGIN - 150, y: A4_HEIGHT - 34, size: 10.5, color: PAPER });
}

function drawFooter(page: LocalPdfPage, documentModel: PatientPlanDocument, number: number, total: number, base: number) {
  page.drawLine({ x1: MARGIN, y1: 58, x2: A4_WIDTH - MARGIN, y2: 58, stroke: LINE, lineWidth: 0.9 });
  page.drawText(`${documentModel.patient.name} · ${documentModel.plan.title}`, { x: MARGIN, y: 42, size: 10.5, color: MUTED });
  page.drawText(`Página ${number} de ${total}`, { x: A4_WIDTH - MARGIN - 82, y: 42, size: 10.5, font: 'bold', color: MUTED });
  drawWrapped(page, 'Detén el ejercicio y contacta a tu fisioterapeuta si aparece dolor fuerte, mareo o síntomas fuera de lo indicado.', MARGIN, 25, A4_WIDTH - MARGIN * 2, Math.max(11, base - 3), 12, { color: MUTED, maxLines: 2 });
}

function drawFact(page: LocalPdfPage, x: number, y: number, width: number, label: string, value: string, base: number) {
  page.drawRect({ x, y, width, height: 66, fill: GREEN_SOFT });
  page.drawText(label.toUpperCase(), { x: x + 12, y: y + 44, size: 10.5, font: 'bold', color: GREEN_DARK });
  drawWrapped(page, value, x + 12, y + 24, width - 24, base, base + 3, { font: 'bold', maxLines: 2 });
}

function drawExerciseRow(
  page: LocalPdfPage,
  exercise: PatientPlanDocumentExercise,
  y: number,
  rowHeight: number,
  base: number,
  includeRest: boolean,
) {
  page.drawRect({ x: MARGIN, y: y - rowHeight + 4, width: A4_WIDTH - MARGIN * 2, height: rowHeight - 4, fill: GREEN_SOFT });
  page.drawRect({ x: MARGIN, y: y - rowHeight + 4, width: 46, height: rowHeight - 4, fill: GREEN });
  page.drawText(String(exercise.order).padStart(2, '0'), { x: MARGIN + 13, y: y - rowHeight / 2 + 1, size: base, font: 'bold', color: PAPER });
  page.drawText(exercise.name, { x: MARGIN + 60, y: y - 20, size: base + 1, font: 'bold', color: INK });
  drawWrapped(page, exerciseDose(exercise, includeRest), MARGIN + 60, y - 41, A4_WIDTH - MARGIN * 2 - 76, Math.max(13, base - 1), base + 1, { color: MUTED, maxLines: 1 });
}

export function renderSimplePatientPlanPdf(
  documentModel: PatientPlanDocument,
  input: PatientPlanDeliveryOptions,
): PatientPlanPdfResult {
  const options = normalizePatientPlanDeliveryOptions({ ...input, mode: 'simple' });
  const base = options.fontScale === 'extra-large' ? 16 : 14;
  const title = options.fontScale === 'extra-large' ? 27 : 24;
  const rowHeight = options.fontScale === 'extra-large' ? 54 : 48;
  const capacity = simpleExerciseRowsPerPage(options.fontScale);
  const exercises = options.includeExercises ? documentModel.exercises : [];
  const pageCount = Math.max(1, Math.ceil(Math.max(1, exercises.length) / capacity));
  const pdf = new LocalPdfDocument({
    title: `${documentModel.plan.title} - ${documentModel.patient.name}`,
    author: documentModel.professional.name,
    subject: 'Plan simple de fisioterapia',
    createdAt: documentModel.generatedAt,
  });

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const page = pdf.addPage();
    drawHeader(page, documentModel, pageIndex === 0 ? 'PLAN SIMPLE DE FISIOTERAPIA' : 'EJERCICIOS · CONTINUACIÓN', base);

    if (pageIndex === 0) {
      const status = patientPlanStatusLabel(documentModel.plan.status);
      const active = documentModel.plan.status === 'active';
      page.drawRect({ x: MARGIN, y: 724, width: active ? 94 : 142, height: 28, fill: active ? GREEN_SOFT : WARM });
      page.drawText(`ESTADO: ${status.toUpperCase()}`, { x: MARGIN + 11, y: 733, size: 10.5, font: 'bold', color: active ? GREEN_DARK : WARM_INK });
      page.drawText('Plan para', { x: MARGIN, y: 690, size: base, color: MUTED });
      page.drawText(documentModel.patient.name, { x: MARGIN, y: 658, size: title, font: 'bold', color: INK });
      page.drawText(documentModel.plan.title, { x: MARGIN, y: 626, size: base + 4, font: 'bold', color: GREEN_DARK });
      drawWrapped(page, `${documentModel.patient.diagnosis} · ${documentModel.patient.affectedArea}`, MARGIN, 602, A4_WIDTH - MARGIN * 2, base, base + 4, { color: MUTED, maxLines: 2 });

      drawFact(page, MARGIN, 506, 160, 'Duración', documentModel.plan.duration, base);
      drawFact(page, MARGIN + 172, 506, 160, 'Frecuencia', documentModel.plan.frequency, base);
      drawFact(page, MARGIN + 344, 506, 175, 'Ejercicios', options.includeExercises ? `${documentModel.exercises.length}` : 'No incluidos', base);

      page.drawText('Objetivo', { x: MARGIN, y: 476, size: base + 1, font: 'bold', color: INK });
      drawWrapped(page, documentModel.plan.objective, MARGIN, 454, A4_WIDTH - MARGIN * 2, base, base + 4, { color: MUTED, maxLines: 3 });

      page.drawRect({ x: MARGIN, y: 344, width: A4_WIDTH - MARGIN * 2, height: 82, fill: GREEN_SOFT });
      page.drawText('Indicaciones generales', { x: MARGIN + 14, y: 402, size: base, font: 'bold', color: GREEN_DARK });
      drawWrapped(page, documentModel.plan.generalInstructions, MARGIN + 14, 379, A4_WIDTH - MARGIN * 2 - 28, base, base + 4, { color: INK, maxLines: 3 });

      if (!options.includeExercises) {
        page.drawText(`${documentModel.professional.name} · ${documentModel.professional.specialty}`, { x: MARGIN, y: 275, size: base, font: 'bold', color: INK });
        page.drawText(`${documentModel.professional.clinic} · Generado ${formatDate(documentModel.generatedAt)}`, { x: MARGIN, y: 248, size: Math.max(12, base - 1), color: MUTED });
      }
    } else {
      page.drawText(documentModel.patient.name, { x: MARGIN, y: 742, size: title - 3, font: 'bold', color: INK });
      page.drawText(documentModel.plan.title, { x: MARGIN, y: 713, size: base + 3, font: 'bold', color: GREEN_DARK });
    }

    if (options.includeExercises) {
      const chunk = exercises.slice(pageIndex * capacity, pageIndex * capacity + capacity);
      const startY = pageIndex === 0 ? 284 : 680;
      page.drawText(pageIndex === 0 ? 'Ejercicios' : 'Ejercicios en orden clínico', { x: MARGIN, y: startY + 20, size: base + 1, font: 'bold', color: INK });
      chunk.forEach((exercise, index) => drawExerciseRow(page, exercise, startY - index * rowHeight, rowHeight, base, options.includeRest));
    }

    drawFooter(page, documentModel, pageIndex + 1, pageCount, base);
  }

  return {
    bytes: pdf.save(),
    filename: patientPlanFilename(documentModel),
    mimeType: 'application/pdf',
    pageCount: pdf.pageCount,
    omittedMedia: [],
  };
}
