import type { PatientPlanDocument, PatientPlanPdfResult, SharePatientPlanResult } from './types';

function safeFilenamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'paciente';
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function patientPlanFilename(documentModel: PatientPlanDocument) {
  const date = documentModel.generatedAt.slice(0, 10);
  return `atal-plan-${safeFilenamePart(documentModel.patient.name)}-${date}.pdf`;
}

export function patientPlanPdfBlob(result: PatientPlanPdfResult) {
  if (result.mimeType !== 'application/pdf') throw new Error('El documento no tiene un tipo PDF válido.');
  return new Blob([bytesToArrayBuffer(result.bytes)], { type: 'application/pdf' });
}

export function downloadPatientPlanPdf(result: PatientPlanPdfResult) {
  const blob = patientPlanPdfBlob(result);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return blob.size;
}

export async function sharePatientPlanPdf(result: PatientPlanPdfResult): Promise<SharePatientPlanResult> {
  const file = new File([bytesToArrayBuffer(result.bytes)], result.filename, { type: 'application/pdf', lastModified: Date.now() });
  const shareData: ShareData = {
    title: 'Plan de fisioterapia Atal',
    text: 'Plan personalizado generado localmente con Atal.',
    files: [file],
  };
  const canShareFile = typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(shareData));
  if (!canShareFile) {
    downloadPatientPlanPdf(result);
    return { status: 'downloaded', reason: 'unsupported' };
  }

  try {
    await navigator.share(shareData);
    return { status: 'shared' };
  } catch (error) {
    downloadPatientPlanPdf(result);
    return { status: 'downloaded', reason: error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed' };
  }
}

export function printPatientPlan() {
  window.print();
}
