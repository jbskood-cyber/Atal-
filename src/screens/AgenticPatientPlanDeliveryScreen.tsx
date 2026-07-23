import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, AlertTriangle } from 'lucide-react';
import { getAtalState } from '@/src/data/atalStore';
import {
  buildPatientPlanDocument,
  getPatientPlanDeliveryEligibility,
} from '@/src/features/patient-delivery/buildPatientPlanDocument';
import { normalizePatientPlanDeliveryOptions } from '@/src/features/patient-delivery/deliveryOptions';
import {
  downloadPatientPlanPdf,
  printPatientPlanPdf,
  sharePatientPlanPdf,
} from '@/src/features/patient-delivery/deliveryActions';
import { resolvePatientPlanMedia } from '@/src/features/patient-delivery/mediaResolver';
import { createPatientPlanPdf } from '@/src/features/patient-delivery/pdfRouter';
import type { PatientPlanDeliveryOptions } from '@/src/features/patient-delivery/types';
import { PatientPlanDeliveryScreen } from './PatientPlanDeliveryScreen';

type PendingDeliveryAction = {
  action: 'download' | 'share' | 'print';
  options?: Partial<PatientPlanDeliveryOptions>;
  requestedAt: string;
};

function actionKey(planId: string) {
  return `atal:delivery-action:${planId}`;
}

function readPendingAction(planId: string): PendingDeliveryAction | null {
  try {
    const raw = sessionStorage.getItem(actionKey(planId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDeliveryAction>;
    if (parsed.action !== 'download' && parsed.action !== 'share' && parsed.action !== 'print') return null;
    if (!parsed.requestedAt || Date.now() - Date.parse(parsed.requestedAt) > 5 * 60_000) return null;
    return { action: parsed.action, options: parsed.options, requestedAt: parsed.requestedAt };
  } catch {
    return null;
  }
}

export function AgenticPatientPlanDeliveryScreen({ planId }: { planId: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const pending = readPendingAction(planId);
    sessionStorage.removeItem(actionKey(planId));
    if (!pending) return;
    let cancelled = false;
    const execute = async () => {
      setState('working');
      setMessage('Preparando el documento solicitado por Atal IA…');
      try {
        const store = getAtalState();
        const plan = store.plans.find((item) => item.id === planId);
        if (!plan) throw new Error('El plan ya no existe.');
        const eligibility = getPatientPlanDeliveryEligibility(store, plan.patientId, plan.id);
        if (!eligibility.allowed) throw new Error(eligibility.reason);
        const documentModel = buildPatientPlanDocument(store, plan.patientId, plan.id);
        const options = normalizePatientPlanDeliveryOptions(pending.options);
        const media = options.mode === 'detailed' && options.includeImages
          ? await resolvePatientPlanMedia(documentModel)
          : [];
        const pdf = await createPatientPlanPdf(documentModel, media, options);
        if (pending.action === 'download') {
          downloadPatientPlanPdf(pdf);
          if (!cancelled) setMessage(`PDF descargado · ${pdf.pageCount} ${pdf.pageCount === 1 ? 'página' : 'páginas'}.`);
        } else if (pending.action === 'share') {
          const result = await sharePatientPlanPdf(pdf);
          if (!cancelled) setMessage(result.status === 'shared'
            ? 'PDF entregado al menú nativo de compartir.'
            : result.status === 'cancelled'
              ? 'Compartir cancelado. El PDF permanece en este dispositivo.'
              : 'Compartir no estaba disponible; el PDF se guardó localmente.');
        } else {
          const result = await printPatientPlanPdf(pdf);
          if (!cancelled) setMessage(result === 'printed'
            ? 'Documento enviado al diálogo de impresión.'
            : 'PDF abierto en el visor para imprimir.');
        }
        if (!cancelled) setState('success');
      } catch (cause) {
        if (!cancelled) {
          setState('error');
          setMessage(cause instanceof Error ? cause.message : 'No pudimos completar la entrega.');
        }
      }
    };
    void execute();
    return () => { cancelled = true; };
  }, [planId]);

  return <>
    <PatientPlanDeliveryScreen planId={planId} />
    {state !== 'idle' && <aside className={`atal-ai-delivery-agent-status is-${state}`} role="status" aria-live="polite">
      {state === 'working' ? <LoaderCircle className="is-spinning" /> : state === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
      <span>{message}</span>
    </aside>}
  </>;
}
