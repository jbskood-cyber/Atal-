import { useEffect, useRef, useState } from 'react';
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

type DeliveryOutcome = {
  state: 'success' | 'error';
  message: string;
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

async function executePendingDelivery(planId: string, pending: PendingDeliveryAction): Promise<DeliveryOutcome> {
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
      return { state: 'success', message: `PDF descargado · ${pdf.pageCount} ${pdf.pageCount === 1 ? 'página' : 'páginas'}.` };
    }
    if (pending.action === 'share') {
      const result = await sharePatientPlanPdf(pdf);
      return {
        state: 'success',
        message: result.status === 'shared'
          ? 'PDF entregado al menú nativo de compartir.'
          : result.status === 'cancelled'
            ? 'Compartir cancelado. El PDF permanece en este dispositivo.'
            : 'Compartir no estaba disponible; el PDF se guardó localmente.',
      };
    }
    const result = await printPatientPlanPdf(pdf);
    return {
      state: 'success',
      message: result === 'printed'
        ? 'Documento enviado al diálogo de impresión.'
        : 'PDF abierto en el visor para imprimir.',
    };
  } catch (cause) {
    return {
      state: 'error',
      message: cause instanceof Error ? cause.message : 'No pudimos completar la entrega.',
    };
  }
}

export function AgenticPatientPlanDeliveryScreen({ planId }: { planId: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const executionRef = useRef<{ planId: string; promise: Promise<DeliveryOutcome> } | null>(null);

  useEffect(() => {
    let active = true;
    let execution = executionRef.current;
    if (!execution || execution.planId !== planId) {
      const pending = readPendingAction(planId);
      sessionStorage.removeItem(actionKey(planId));
      if (!pending) {
        executionRef.current = null;
        return;
      }
      execution = { planId, promise: executePendingDelivery(planId, pending) };
      executionRef.current = execution;
    }

    setState('working');
    setMessage('Preparando el documento solicitado por Atal IA…');
    void execution.promise.then((outcome) => {
      if (!active) return;
      setState(outcome.state);
      setMessage(outcome.message);
    });

    return () => { active = false; };
  }, [planId]);

  return <>
    <PatientPlanDeliveryScreen planId={planId} />
    {state !== 'idle' && <aside className={`atal-ai-delivery-agent-status is-${state}`} role="status" aria-live="polite">
      {state === 'working' ? <LoaderCircle className="is-spinning" /> : state === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
      <span>{message}</span>
    </aside>}
  </>;
}
