import type {
  PatientPlanDocument,
  PatientPlanPdfResult,
  PatientWhatsAppTarget,
  SharePatientPlanResult,
} from './types';

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
    if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' };
    downloadPatientPlanPdf(result);
    return { status: 'downloaded', reason: 'failed' };
  }
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

export function resolvePatientWhatsAppTarget(patient: PatientPlanDocument['patient']): PatientWhatsAppTarget | null {
  const patientPhone = normalizeWhatsAppPhone(patient.phone);
  if (patientPhone) return { phone: patientPhone, source: 'patient', label: patient.name };
  const responsiblePhone = normalizeWhatsAppPhone(patient.responsibleContact);
  if (responsiblePhone) return { phone: responsiblePhone, source: 'responsible', label: 'Responsable del paciente' };
  return null;
}

export function patientPlanWhatsAppUrl(documentModel: PatientPlanDocument, target: PatientWhatsAppTarget) {
  const message = `Hola. Tengo preparado el plan de rehabilitación de ${documentModel.patient.name}. En el siguiente paso adjuntaré el PDF para que puedas guardarlo y revisarlo.`;
  return `https://wa.me/${target.phone}?text=${encodeURIComponent(message)}`;
}

export function openPatientPlanWhatsApp(documentModel: PatientPlanDocument) {
  const target = resolvePatientWhatsAppTarget(documentModel.patient);
  if (!target) throw new Error('Añade un número válido del paciente o de su responsable antes de abrir WhatsApp.');
  const url = patientPlanWhatsAppUrl(documentModel, target);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
  return target;
}

export function printPatientPlanPdf(result: PatientPlanPdfResult): Promise<'printed' | 'opened'> {
  const blob = patientPlanPdfBlob(result);
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    let finished = false;
    let fallbackTimer = 0;

    const delayedCleanup = () => {
      window.setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };

    const finish = (resultValue: 'printed' | 'opened') => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      delayedCleanup();
      resolve(resultValue);
    };

    const openFallback = () => {
      if (finished) return;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        finished = true;
        window.clearTimeout(fallbackTimer);
        frame.remove();
        URL.revokeObjectURL(url);
        reject(new Error('El navegador bloqueó la ventana de impresión. Descarga el PDF para imprimirlo.'));
        return;
      }
      finish('opened');
    };

    frame.title = 'Documento PDF para imprimir';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.onload = () => {
      try {
        const target = frame.contentWindow;
        if (!target) { openFallback(); return; }
        target.focus();
        target.print();
        finish('printed');
      } catch {
        openFallback();
      }
    };
    frame.onerror = openFallback;
    frame.src = url;
    document.body.appendChild(frame);
    fallbackTimer = window.setTimeout(openFallback, 3500);
  });
}
