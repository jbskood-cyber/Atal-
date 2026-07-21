import { getExerciseMedia } from '@/src/data/exerciseMediaRepository';
import type { PatientPlanDocument, PatientPlanResolvedMedia } from './types';

const MAX_PDF_IMAGE_EDGE = 1200;

async function loadImage(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }

  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('No pudimos leer la imagen local.'));
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) };
}

async function imageBlobToJpeg(blob: Blob) {
  const loaded = await loadImage(blob);
  try {
    const scale = Math.min(1, MAX_PDF_IMAGE_EDGE / Math.max(loaded.width, loaded.height));
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('El navegador no permite preparar la imagen para el PDF.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(loaded.source, 0, 0, width, height);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No pudimos convertir la imagen local.')), 'image/jpeg', 0.86);
    });
    return { jpegBytes: new Uint8Array(await jpeg.arrayBuffer()), width, height };
  } finally {
    loaded.dispose();
  }
}

export async function resolvePatientPlanMedia(documentModel: PatientPlanDocument): Promise<PatientPlanResolvedMedia[]> {
  return Promise.all(documentModel.exercises.map(async (exercise): Promise<PatientPlanResolvedMedia> => {
    if (!exercise.media.mediaId || exercise.media.type === 'none') {
      return { exerciseId: exercise.id, omittedReason: 'Sin imagen local disponible.' };
    }
    if (exercise.media.type === 'video' || exercise.media.type === 'animation') {
      return { exerciseId: exercise.id, omittedReason: 'El recurso es un video o animación y no se incrusta en el PDF.' };
    }

    try {
      const record = await getExerciseMedia(exercise.media.mediaId);
      const image = record?.files.find((file) => file.type.startsWith('image/'));
      if (!image) return { exerciseId: exercise.id, omittedReason: 'El recurso local no contiene una imagen compatible.' };
      const converted = await imageBlobToJpeg(image);
      return { exerciseId: exercise.id, ...converted };
    } catch (error) {
      return {
        exerciseId: exercise.id,
        omittedReason: error instanceof Error ? error.message : 'No pudimos preparar la imagen local.',
      };
    }
  }));
}
