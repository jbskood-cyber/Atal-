'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileText,
  LoaderCircle,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { useAtalStore } from '@/src/data/atalStore';
import {
  buildPatientPlanDocument,
  getPatientPlanDeliveryEligibility,
  patientPlanStatusLabel,
} from '@/src/features/patient-delivery/buildPatientPlanDocument';
import {
  DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS,
  estimatePatientPlanPages,
  normalizePatientPlanDeliveryOptions,
} from '@/src/features/patient-delivery/deliveryOptions';
import {
  downloadPatientPlanPdf,
  openPatientPlanWhatsApp,
  printPatientPlanPdf,
  resolvePatientWhatsAppTarget,
  sharePatientPlanPdf,
} from '@/src/features/patient-delivery/deliveryActions';
import { resolvePatientPlanMedia } from '@/src/features/patient-delivery/mediaResolver';
import { createPatientPlanPdf } from '@/src/features/patient-delivery/pdfRouter';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocumentMode,
  PatientPlanPdfResult,
} from '@/src/features/patient-delivery/types';
import '@/src/styles/atal-patient-delivery.css';

function copyDefaultOptions(): PatientPlanDeliveryOptions {
  return { ...DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS };
}

export function PatientPlanDeliveryScreen({ planId }: { planId: string }) {
  const router = useRouter();
  const state = useAtalStore((store) => store);
  const plan = state.plans.find((item) => item.id === planId) ?? null;
  const patientId = plan?.patientId ?? '';
  const eligibility = useMemo(
    () => getPatientPlanDeliveryEligibility(state, patientId, planId),
    [state.updatedAt, patientId, planId],
  );
  const documentModel = useMemo(
    () => eligibility.allowed ? buildPatientPlanDocument(state, patientId, planId) : null,
    [state.updatedAt, patientId, planId, eligibility.allowed],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [options, setOptions] = useState<PatientPlanDeliveryOptions>(copyDefaultOptions);
  const normalizedOptions = useMemo(() => normalizePatientPlanDeliveryOptions(options), [options]);
  const estimate = useMemo(
    () => documentModel ? estimatePatientPlanPages(documentModel, normalizedOptions) : null,
    [documentModel, normalizedOptions],
  );
  const recipient = useMemo(
    () => documentModel ? resolvePatientWhatsAppTarget(documentModel.patient) : null,
    [documentModel],
  );
  const optionsKey = JSON.stringify(normalizedOptions);
  const [pdfResult, setPdfResult] = useState<PatientPlanPdfResult | null>(null);
  const [busy, setBusy] = useState<'download' | 'share' | 'print' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setConfirmed(false);
  }, [planId, plan?.updatedAt]);

  useEffect(() => {
    setPdfResult(null);
    setMessage('');
    setError('');
  }, [planId, plan?.updatedAt, optionsKey]);

  if (!plan || !documentModel) {
    return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page"><div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div><section className="atal-delivery-state is-blocked"><AlertTriangle /><h1>No se puede generar este documento</h1><p>{eligibility.reason}</p><button type="button" onClick={() => router.back()}>Volver al plan</button></section></main></AtalShell>;
  }

  const actionsEnabled = !eligibility.requiresConfirmation || confirmed;
  const status = patientPlanStatusLabel(documentModel.plan.status);
  const includesLog = normalizedOptions.mode === 'plan-and-log' || normalizedOptions.mode === 'log-only';

  const updateOptions = (patch: Partial<PatientPlanDeliveryOptions>) => {
    setOptions((current) => normalizePatientPlanDeliveryOptions({ ...current, ...patch }));
  };

  const chooseMode = (mode: PatientPlanDocumentMode) => {
    setOptions((current) => normalizePatientPlanDeliveryOptions({
      ...current,
      mode,
      includeImages: mode === 'detailed' ? current.includeImages : false,
    }));
  };

  const preparePdf = async () => {
    if (pdfResult) return pdfResult;
    const resolvedMedia = normalizedOptions.mode === 'detailed' && normalizedOptions.includeImages
      ? await resolvePatientPlanMedia(documentModel)
      : [];
    const result = await createPatientPlanPdf(documentModel, resolvedMedia, normalizedOptions);
    if (!new TextDecoder('iso-8859-1').decode(result.bytes.slice(0, 8)).startsWith('%PDF-1.4')) throw new Error('El archivo generado no tiene una firma PDF válida.');
    setPdfResult(result);
    return result;
  };

  const download = async () => {
    if (!actionsEnabled || busy) return;
    setBusy('download'); setMessage(''); setError('');
    try {
      const result = await preparePdf();
      const size = downloadPatientPlanPdf(result);
      setMessage(`PDF descargado · ${result.pageCount} ${result.pageCount === 1 ? 'página' : 'páginas'} · ${Math.max(1, Math.round(size / 1024))} KB.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos generar el PDF.');
    } finally { setBusy(null); }
  };

  const share = async () => {
    if (!actionsEnabled || busy) return;
    setBusy('share'); setMessage(''); setError('');
    try {
      const result = await preparePdf();
      const shared = await sharePatientPlanPdf(result);
      setMessage(shared.status === 'shared'
        ? 'El PDF se entregó al menú nativo de compartir.'
        : shared.status === 'cancelled'
          ? 'Compartir cancelado. El documento permanece únicamente en este dispositivo.'
          : 'El envío nativo no estuvo disponible; guardamos el PDF mediante una descarga local.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos compartir el PDF.');
    } finally { setBusy(null); }
  };

  const print = async () => {
    if (!actionsEnabled || busy) return;
    setBusy('print'); setMessage(''); setError('');
    try {
      const result = await preparePdf();
      const printResult = await printPatientPlanPdf(result);
      setMessage(printResult === 'printed' ? 'Documento enviado al diálogo de impresión.' : 'PDF abierto para imprimir desde el visor del dispositivo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos preparar la impresión.');
    } finally { setBusy(null); }
  };

  const openWhatsApp = () => {
    if (!actionsEnabled) return;
    setMessage(''); setError('');
    try {
      const target = openPatientPlanWhatsApp(documentModel);
      setMessage(`WhatsApp abierto para ${target.source === 'patient' ? 'el paciente' : 'el responsable'}. El fisioterapeuta decide qué archivo adjuntar y cuándo enviarlo.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos abrir WhatsApp.');
    }
  };

  return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div>

    <section className="atal-delivery-heading">
      <span><FileText /></span>
      <div><small>Documento clínico local</small><h1>Preparar entrega</h1><p>Elige lo esencial. Atal adapta el documento automáticamente.</p></div>
    </section>

    <section className="atal-delivery-plan-summary">
      <div><small>Paciente</small><h2>{documentModel.patient.name}</h2><p>{documentModel.plan.title}</p></div>
      <dl><div><dt>Frecuencia</dt><dd>{documentModel.plan.frequency}</dd></div><div><dt>Duración</dt><dd>{documentModel.plan.duration}</dd></div><div><dt>Ejercicios</dt><dd>{documentModel.exercises.length}</dd></div></dl>
    </section>

    <section className={`atal-delivery-safety is-${eligibility.state}`}>
      {eligibility.state === 'ready' ? <ShieldCheck /> : <AlertTriangle />}
      <div><b>{eligibility.state === 'ready' ? 'Generación privada y local' : `Plan ${status.toLowerCase()}`}</b><p>{eligibility.reason} Los datos no se suben a un servidor.</p></div>
    </section>

    {eligibility.requiresConfirmation && <label className="atal-delivery-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>Entiendo que este plan no está activo</b><small>El PDF conservará claramente el estado “{status}”.</small></span><Check /></label>}

    <section className="atal-delivery-card">
      <header><div><small>Documento</small><h2>¿Qué recibirá el paciente?</h2></div></header>
      <div className="atal-delivery-mode-grid is-compact">
        <ModeButton active={normalizedOptions.mode === 'plan-and-log'} title="Plan + registro" detail="Plan principal y hojas para registrar sesiones." onClick={() => chooseMode('plan-and-log')} />
        <ModeButton active={normalizedOptions.mode === 'plan-only'} title="Solo plan" detail="Ejercicios, dosis, descansos e indicaciones." onClick={() => chooseMode('plan-only')} />
        <ModeButton active={normalizedOptions.mode === 'log-only'} title="Solo registro" detail="Hojas universales para anotar resultados reales." onClick={() => chooseMode('log-only')} />
      </div>

      {includesLog && <div className="atal-delivery-inline-setting">
        <div><b>Sesiones a registrar</b><small>Una sesión puede continuar en otra hoja si el plan es extenso.</small></div>
        <div className="atal-delivery-stepper">
          <button type="button" aria-label="Restar una sesión" onClick={() => updateOptions({ sessionCount: normalizedOptions.sessionCount - 1 })}><Minus /></button>
          <input aria-label="Sesiones a registrar" type="number" inputMode="numeric" min={1} max={99} value={normalizedOptions.sessionCount} onChange={(event) => updateOptions({ sessionCount: Number(event.target.value) })} />
          <button type="button" aria-label="Añadir una sesión" onClick={() => updateOptions({ sessionCount: normalizedOptions.sessionCount + 1 })}><Plus /></button>
        </div>
      </div>}

      {normalizedOptions.mode !== 'detailed' && <div className="atal-delivery-inline-setting is-stacked">
        <div><b>Legibilidad</b><small>La fuente nunca se reduce para forzar el contenido.</small></div>
        <div className="atal-delivery-segment" role="group" aria-label="Tamaño de letra">
          <button type="button" aria-pressed={normalizedOptions.fontScale === 'large'} className={normalizedOptions.fontScale === 'large' ? 'is-active' : ''} onClick={() => updateOptions({ fontScale: 'large' })}>Letra grande</button>
          <button type="button" aria-pressed={normalizedOptions.fontScale === 'extra-large'} className={normalizedOptions.fontScale === 'extra-large' ? 'is-active' : ''} onClick={() => updateOptions({ fontScale: 'extra-large' })}>Letra extra grande</button>
        </div>
      </div>}

      <details className="atal-delivery-advanced" open={normalizedOptions.mode === 'detailed'}>
        <summary><span><b>Opciones avanzadas</b><small>Material educativo detallado e imágenes.</small></span><ChevronDown /></summary>
        <button type="button" className={`atal-delivery-detailed-choice${normalizedOptions.mode === 'detailed' ? ' is-active' : ''}`} onClick={() => chooseMode('detailed')}><ShieldCheck /><span><b>Plan detallado</b><small>Conserva posición, instrucciones, precauciones, material y notas.</small></span><Check /></button>
        {normalizedOptions.mode === 'detailed' && <label className="atal-delivery-image-choice"><input type="checkbox" checked={normalizedOptions.includeImages} onChange={(event) => updateOptions({ includeImages: event.target.checked })} /><span><b>Incluir imágenes disponibles</b><small>Se procesan localmente; los formatos incompatibles usan placeholders seguros.</small></span></label>}
      </details>
    </section>

    <section className="atal-delivery-recipient">
      <MessageCircle />
      <div><small>WhatsApp</small><b>{recipient ? `Destinatario: ${recipient.label}` : 'Sin número disponible'}</b><p>{recipient ? 'Atal abrirá el chat con un mensaje preparado. El PDF no se adjunta ni se envía automáticamente.' : 'Añade un teléfono válido al paciente o a su responsable para habilitar el acceso directo.'}</p></div>
    </section>

    {estimate && <section className="atal-delivery-estimate"><FileText /><div><small>Documento estimado</small><b>{estimate.summary}</b><p>La plantilla se adapta al plan; el plan nunca se comprime para caber.</p></div></section>}

    <section className="atal-delivery-actions" aria-label="Acciones del documento">
      <button type="button" className="is-primary" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void download()}>{busy === 'download' ? <LoaderCircle className="is-spinning" /> : <Download />}<span><b>Descargar PDF</b><small>Documento premium listo para adjuntar</small></span></button>
      <button type="button" disabled={!actionsEnabled || !recipient || Boolean(busy)} onClick={openWhatsApp}><MessageCircle /><span><b>Abrir WhatsApp</b><small>{recipient ? 'Tú decides qué adjuntar y enviar' : 'Falta un número válido'}</small></span></button>
      <div className="atal-delivery-secondary-actions">
        <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void share()}>{busy === 'share' ? <LoaderCircle className="is-spinning" /> : <Share2 />}<span><b>Compartir</b><small>Adjunta el PDF desde el menú nativo</small></span></button>
        <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void print()}>{busy === 'print' ? <LoaderCircle className="is-spinning" /> : <Printer />}<span><b>Imprimir</b><small>Abre el PDF para imprimir</small></span></button>
      </div>
    </section>

    {pdfResult?.omittedMedia.length ? <p className="atal-delivery-feedback"><AlertTriangle /> {pdfResult.omittedMedia.length} {pdfResult.omittedMedia.length === 1 ? 'imagen no pudo incluirse' : 'imágenes no pudieron incluirse'}; el documento se generó con placeholders seguros.</p> : null}
    {message && <p className="atal-action-message" role="status">{message}</p>}
    {error && <p className="atal-action-message is-error" role="alert">{error}</p>}
  </main></AtalShell>;
}

function ModeButton({ active, title, detail, onClick }: { active: boolean; title: string; detail: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} className={active ? 'is-active' : ''} onClick={onClick}><span><b>{title}</b><small>{detail}</small></span><Check /></button>;
}
