import { patientPlanFilename } from './deliveryActions';
import {
  A4_HEIGHT,
  A4_WIDTH,
  LocalPdfDocument,
  type LocalPdfPage,
  type PdfColor,
  type PdfEmbeddedImage,
  wrapPdfText,
} from './pdfWriter';
import type { PatientPlanDocument, PatientPlanDocumentExercise, PatientPlanPdfResult, PatientPlanResolvedMedia } from './types';
import { patientPlanStatusLabel } from './buildPatientPlanDocument';

const GREEN: PdfColor = [0.494, 0.714, 0.584];
const GREEN_DARK: PdfColor = [0.196, 0.353, 0.275];
const GREEN_SOFT: PdfColor = [0.925, 0.961, 0.941];
const INK: PdfColor = [0.102, 0.125, 0.114];
const MUTED: PdfColor = [0.36, 0.41, 0.39];
const LINE: PdfColor = [0.84, 0.87, 0.85];
const PAPER: PdfColor = [1, 1, 1];
const WARM: PdfColor = [0.965, 0.91, 0.76];
const WARM_INK: PdfColor = [0.45, 0.32, 0.08];
const MARGIN = 42;
const FOOTER_Y = 34;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

function drawWrapped(
  page: LocalPdfPage,
  text: string,
  x: number,
  y: number,
  width: number,
  options: { size?: number; lineHeight?: number; color?: PdfColor; font?: 'regular' | 'bold'; maxLines?: number } = {},
) {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size * 1.35;
  const lines = wrapPdfText(text, width, size, options.font ?? 'regular');
  const visible = options.maxLines ? lines.slice(0, options.maxLines) : lines;
  visible.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, color: options.color ?? INK, font: options.font }));
  return { y: y - visible.length * lineHeight, lines: visible.length, truncated: visible.length < lines.length };
}

function drawDocumentHeader(page: LocalPdfPage, documentModel: PatientPlanDocument, subtitle: string) {
  page.drawRect({ x: 0, y: A4_HEIGHT - 54, width: A4_WIDTH, height: 54, fill: GREEN });
  page.drawText('Atal', { x: MARGIN, y: A4_HEIGHT - 34, size: 20, font: 'bold', color: PAPER });
  page.drawText(subtitle, { x: 113, y: A4_HEIGHT - 31, size: 9, font: 'bold', color: PAPER });
  page.drawText(documentModel.professional.clinic, { x: A4_WIDTH - MARGIN - 150, y: A4_HEIGHT - 31, size: 8, color: PAPER });
}

function drawFooter(page: LocalPdfPage, documentModel: PatientPlanDocument, number: number, total: number) {
  page.drawLine({ x1: MARGIN, y1: FOOTER_Y + 18, x2: A4_WIDTH - MARGIN, y2: FOOTER_Y + 18, stroke: LINE, lineWidth: 0.8 });
  page.drawText(`${documentModel.patient.name} · ${documentModel.plan.title}`, { x: MARGIN, y: FOOTER_Y + 5, size: 7.5, color: MUTED });
  page.drawText(`Página ${number} de ${total}`, { x: A4_WIDTH - MARGIN - 72, y: FOOTER_Y + 5, size: 7.5, font: 'bold', color: MUTED });
  page.drawText('Detén el ejercicio y contacta a tu fisioterapeuta si los síntomas superan los límites indicados.', { x: MARGIN, y: FOOTER_Y - 7, size: 6.8, color: MUTED });
}

function drawFact(page: LocalPdfPage, x: number, y: number, width: number, label: string, value: string) {
  page.drawRect({ x, y, width, height: 56, fill: GREEN_SOFT });
  page.drawText(label.toUpperCase(), { x: x + 12, y: y + 36, size: 7.5, font: 'bold', color: GREEN_DARK });
  drawWrapped(page, value, x + 12, y + 20, width - 24, { size: 10, font: 'bold', color: INK, lineHeight: 12, maxLines: 2 });
}

function drawCover(page: LocalPdfPage, documentModel: PatientPlanDocument) {
  drawDocumentHeader(page, documentModel, 'PLAN PERSONALIZADO DE FISIOTERAPIA');
  const status = patientPlanStatusLabel(documentModel.plan.status);
  const active = documentModel.plan.status === 'active';
  page.drawRect({ x: MARGIN, y: 728, width: active ? 94 : 130, height: 26, fill: active ? GREEN_SOFT : WARM });
  page.drawText(`ESTADO: ${status.toUpperCase()}`, { x: MARGIN + 10, y: 737, size: 8, font: 'bold', color: active ? GREEN_DARK : WARM_INK });

  page.drawText('Plan para', { x: MARGIN, y: 693, size: 10, color: MUTED });
  page.drawText(documentModel.patient.name, { x: MARGIN, y: 661, size: 25, font: 'bold', color: INK });
  page.drawText(documentModel.plan.title, { x: MARGIN, y: 631, size: 15, font: 'bold', color: GREEN_DARK });
  drawWrapped(page, `${documentModel.patient.diagnosis} · ${documentModel.patient.affectedArea}`, MARGIN, 610, A4_WIDTH - MARGIN * 2, { size: 9.5, color: MUTED, lineHeight: 13, maxLines: 2 });

  drawFact(page, MARGIN, 524, 156, 'Duración', documentModel.plan.duration);
  drawFact(page, MARGIN + 168, 524, 156, 'Frecuencia', documentModel.plan.frequency);
  drawFact(page, MARGIN + 336, 524, 175, 'Ejercicios', `${documentModel.exercises.length} en orden clínico`);

  page.drawText('Objetivo del plan', { x: MARGIN, y: 486, size: 11, font: 'bold', color: INK });
  drawWrapped(page, documentModel.plan.objective, MARGIN, 466, A4_WIDTH - MARGIN * 2, { size: 10, color: MUTED, lineHeight: 14, maxLines: 4 });

  page.drawRect({ x: MARGIN, y: 320, width: A4_WIDTH - MARGIN * 2, height: 112, fill: GREEN_SOFT });
  page.drawText('Indicaciones generales', { x: MARGIN + 16, y: 405, size: 11, font: 'bold', color: GREEN_DARK });
  drawWrapped(page, documentModel.plan.generalInstructions, MARGIN + 16, 382, A4_WIDTH - MARGIN * 2 - 32, { size: 9.5, color: INK, lineHeight: 13, maxLines: 6 });

  if (!active) {
    page.drawRect({ x: MARGIN, y: 264, width: A4_WIDTH - MARGIN * 2, height: 42, fill: WARM });
    page.drawText('Documento de un plan no activo', { x: MARGIN + 14, y: 287, size: 9.5, font: 'bold', color: WARM_INK });
    page.drawText(`Este plan está ${status.toLowerCase()} y conserva ese estado en todas las páginas.`, { x: MARGIN + 14, y: 273, size: 8.5, color: WARM_INK });
  }

  const listTop = active ? 282 : 238;
  page.drawText('Contenido', { x: MARGIN, y: listTop, size: 11, font: 'bold', color: INK });
  documentModel.exercises.slice(0, 8).forEach((exercise, index) => {
    const y = listTop - 25 - index * 20;
    page.drawText(String(exercise.order).padStart(2, '0'), { x: MARGIN, y, size: 8, font: 'bold', color: GREEN_DARK });
    page.drawText(exercise.name, { x: MARGIN + 28, y, size: 9, font: 'bold', color: INK });
    page.drawText(exercise.doseLabel, { x: A4_WIDTH - MARGIN - 190, y, size: 7.5, color: MUTED });
  });
  if (documentModel.exercises.length > 8) page.drawText(`+ ${documentModel.exercises.length - 8} ejercicios adicionales`, { x: MARGIN + 28, y: listTop - 25 - 8 * 20, size: 8, color: MUTED });

  page.drawText(`${documentModel.professional.name} · ${documentModel.professional.specialty}`, { x: MARGIN, y: 86, size: 9, font: 'bold', color: INK });
  page.drawText(`${documentModel.professional.clinic} · Generado el ${formatDate(documentModel.generatedAt)} · Plan actualizado el ${formatDate(documentModel.plan.updatedAt)}`, { x: MARGIN, y: 70, size: 7.5, color: MUTED });
}

type ExercisePageState = { page: LocalPdfPage; y: number };

function drawImageOrPlaceholder(page: LocalPdfPage, exercise: PatientPlanDocumentExercise, image?: PdfEmbeddedImage) {
  const box = { x: 345, y: 578, width: 208, height: 142 };
  page.drawRect({ ...box, fill: GREEN_SOFT });
  if (!image) {
    page.strokeRect({ ...box, stroke: GREEN, lineWidth: 1 });
    page.drawText('Imagen no disponible', { x: box.x + 50, y: box.y + 76, size: 9, font: 'bold', color: GREEN_DARK });
    page.drawText('Sigue las indicaciones escritas.', { x: box.x + 43, y: box.y + 58, size: 7.5, color: MUTED });
    return;
  }
  const scale = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height });
  page.strokeRect({ ...box, stroke: LINE, lineWidth: 0.8 });
}

export async function createPatientPlanPdf(
  documentModel: PatientPlanDocument,
  resolvedMedia: PatientPlanResolvedMedia[],
): Promise<PatientPlanPdfResult> {
  const pdf = new LocalPdfDocument({
    title: `${documentModel.plan.title} - ${documentModel.patient.name}`,
    author: documentModel.professional.name,
    subject: 'Plan personalizado de fisioterapia',
    createdAt: documentModel.generatedAt,
  });
  const pages: LocalPdfPage[] = [];
  const cover = pdf.addPage();
  pages.push(cover);
  drawCover(cover, documentModel);

  const mediaByExercise = new Map(resolvedMedia.map((item) => [item.exerciseId, item]));
  const omittedMedia: string[] = [];
  let imageIndex = 0;

  const startExercisePage = (exercise: PatientPlanDocumentExercise, continuation = false): ExercisePageState => {
    const page = pdf.addPage();
    pages.push(page);
    drawDocumentHeader(page, documentModel, continuation ? `EJERCICIO ${exercise.order} · CONTINUACIÓN` : `EJERCICIO ${exercise.order} DE ${documentModel.exercises.length}`);
    if (continuation) {
      page.drawText(exercise.name, { x: MARGIN, y: 750, size: 17, font: 'bold', color: INK });
      return { page, y: 715 };
    }

    page.drawText(`${exercise.region.toUpperCase()} · ${exercise.category.toUpperCase()}`, { x: MARGIN, y: 744, size: 8, font: 'bold', color: GREEN_DARK });
    drawWrapped(page, exercise.name, MARGIN, 716, 280, { size: 19, font: 'bold', color: INK, lineHeight: 22, maxLines: 2 });
    drawWrapped(page, exercise.objective, MARGIN, 662, 280, { size: 9.5, color: MUTED, lineHeight: 13, maxLines: 4 });

    const media = mediaByExercise.get(exercise.id);
    let image: PdfEmbeddedImage | undefined;
    if (media?.jpegBytes && media.width && media.height) {
      image = { key: `Im${++imageIndex}`, bytes: media.jpegBytes, width: media.width, height: media.height };
    } else if (exercise.media.type !== 'none') omittedMedia.push(exercise.name);
    drawImageOrPlaceholder(page, exercise, image);

    page.drawRect({ x: MARGIN, y: 568, width: 286, height: 58, fill: GREEN });
    page.drawText('DOSIS INDICADA', { x: MARGIN + 14, y: 605, size: 7.5, font: 'bold', color: PAPER });
    drawWrapped(page, exercise.doseLabel, MARGIN + 14, 586, 258, { size: 10, font: 'bold', color: PAPER, lineHeight: 12, maxLines: 2 });
    return { page, y: 535 };
  };

  for (const exercise of documentModel.exercises) {
    let state = startExercisePage(exercise);

    const ensureSpace = (height: number) => {
      if (state.y - height < FOOTER_Y + 45) state = startExercisePage(exercise, true);
    };

    const section = (title: string, paragraphs: string[], options: { numbered?: boolean; attention?: boolean } = {}) => {
      const clean = paragraphs.map((item) => item.trim()).filter(Boolean);
      if (!clean.length) return;
      ensureSpace(42);
      state.page.drawText(title, { x: MARGIN, y: state.y, size: 10.5, font: 'bold', color: options.attention ? WARM_INK : INK });
      state.y -= 19;
      clean.forEach((paragraph, index) => {
        const prefix = options.numbered ? `${index + 1}. ` : '';
        const lines = wrapPdfText(`${prefix}${paragraph}`, A4_WIDTH - MARGIN * 2 - (options.numbered ? 10 : 0), 9.2, 'regular');
        lines.forEach((line) => {
          ensureSpace(14);
          state.page.drawText(line, { x: MARGIN + (options.numbered ? 10 : 0), y: state.y, size: 9.2, color: options.attention ? WARM_INK : MUTED });
          state.y -= 13;
        });
        state.y -= 3;
      });
      state.y -= 7;
    };

    section('Posición inicial', [exercise.startingPosition]);
    section('Cómo realizarlo', exercise.instructions.length ? exercise.instructions : ['Realiza el movimiento lentamente y con control.'], { numbered: true });
    section('Precauciones', [exercise.precautions, exercise.maxPain === null ? '' : `Dolor máximo indicado: ${exercise.maxPain}/10.`], { attention: true });
    section('Material', [exercise.equipment]);
    if (exercise.therapistNotes) section('Indicación del fisioterapeuta', [exercise.therapistNotes]);
  }

  pages.forEach((page, index) => drawFooter(page, documentModel, index + 1, pages.length));
  const bytes = pdf.save();
  return {
    bytes,
    filename: patientPlanFilename(documentModel),
    mimeType: 'application/pdf',
    pageCount: pdf.pageCount,
    omittedMedia,
  };
}
