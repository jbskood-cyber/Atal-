'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  FileText,
  LoaderCircle,
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
  printPatientPlanPdf,
  sharePatientPlanPdf,
} from '@/src/features/patient-delivery/deliveryActions';
import { resolvePatientPlanMedia } from '@/src/features/patient-delivery/mediaResolver';
import { createPatientPlanPdf } from '@/src/features/patient-delivery/pdfRouter';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocumentMode,
  PatientPlanLogFields,
  PatientPlanPdfResult,
} from '@/src/features/patient-delivery/types';
import '@/src/styles/atal-patient-delivery.css';

const SESSION_PRESETS = [4, 6, 8, 10, 12, 20];

function copyDefaultOptions(): PatientPlanDeliveryOptions {
  return {
    ...DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS,
    logFields: { ...DEFAULT_PATIENT_PLAN_DELIVERY_OPTIONS.logFields },
  };
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
  const optionsKey = JSON.stringify(normalizedOptions);
  const [pdfResult, setPdfResult] = useState<PatientPlanPdfResult | null>(null);
  const [busy, setBusy] = useState<'download' | 'share' | 'print' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setConfirmed(false);
    setPdfResult(null);
    setMessage('');
    setError('');
  }, [planId, plan?.updatedAt, optionsKey]);

  if (!plan || !documentModel) {
    return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page"><div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div><section className="atal-delivery-state is-blocked"><AlertTriangle /><h1>No se puede generar este documento</h1><p>{eligibility.reason}</p><button type="button" onClick={() => router.back()}>Volver al plan</button></section></main></AtalShell>;
  }

  const actionsEnabled = !eligibility.requiresConfirmation || confirmed;
  const status = patientPlanStatusLabel(documentModel.plan.status);

  const updateOptions = (patch: Partial<PatientPlanDeliveryOptions>) => {
    setOptions((current) => normalizePatientPlanDeliveryOptions({ ...current, ...patch }));
  };

  const updateLogField = (field: keyof PatientPlanLogFields, value: boolean) => {
    setOptions((current) => normalizePatientPlanDeliveryOptions({
      ...current,
      logFields: { ...current.logFields, [field]: value },
    }));
  };

  const chooseMode = (mode: PatientPlanDocumentMode) => {
    setOptions((current) => normalizePatientPlanDeliveryOptions({
      ...current,
      mode,
      includeExercises: mode === 'detailed' ? true : current.includeExercises,
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
        ? 'El archivo se entregó al menú nativo de compartir.'
        : shared.status === 'cancelled'
          ? 'Compartir cancelado. El documento permanece únicamente en este dispositivo.'
          : 'El envío nativo no estuvo disponible; guardamos el documento mediante una descarga local.');
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

  return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div>

    <section className="atal-delivery-heading">
      <span><FileText /></span>
      <div><small>Documento clínico local</small><h1>Preparar entrega</h1><p>Configura únicamente lo que el paciente necesita recibir o registrar.</p></div>
    </section>

    <section className="atal-delivery-plan-summary">
      <div><small>Paciente</small><h2>{documentModel.patient.name}</h2><p>{documentModel.plan.title}</p></div>
      <dl><div><dt>Frecuencia</dt><dd>{documentModel.plan.frequency}</dd></div><div><dt>Duración</dt><dd>{documentModel.plan.duration}</dd></div><div><dt>Ejercicios</dt><dd>{documentModel.exercises.length}</dd></div></dl>
    </section>

    <section className={`atal-delivery-safety is-${eligibility.state}`}>
      {eligibility.state === 'ready' ? <ShieldCheck /> : <AlertTriangle />}
      <div><b>{eligibility.state === 'ready' ? 'Generación privada y local' : `Plan ${status.toLowerCase()}`}</b><p>{eligibility.reason} Los datos no se suben a un servidor.</p></div>
    </section>

    {eligibility.requiresConfirmation && <label className="atal-delivery-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>Entiendo que este plan no está activo</b><small>El PDF mostrará claramente el estado “{status}” y no lo presentará como tratamiento vigente.</small></span><Check /></label>}

    <section className="atal-delivery-section">
      <header><small>Paso 1</small><h2>Tipo de documento</h2></header>
      <div className="atal-delivery-mode-grid">
        <button type="button" className={normalizedOptions.mode === 'simple' ? 'is-active' : ''} onClick={() => chooseMode('simple')}><FileText /><span><b>Plan simple</b><small>Resumen accesible, una hoja como prioridad.</small></span><Check /></button>
        <button type="button" className={normalizedOptions.mode === 'session-log' ? 'is-active' : ''} onClick={() => chooseMode('session-log')}><Check /><span><b>Registro de sesiones</b><small>Formato rellenable por sesiones de rehabilitación.</small></span><Check /></button>
        <button type="button" className={normalizedOptions.mode === 'detailed' ? 'is-active' : ''} onClick={() => chooseMode('detailed')}><ShieldCheck /><span><b>Plan detallado</b><small>Material completo con instrucciones e imágenes opcionales.</small></span><Check /></button>
      </div>
    </section>

    {normalizedOptions.mode !== 'detailed' && <section className="atal-delivery-section">
      <header><small>Paso 2</small><h2>Legibilidad</h2></header>
      <div className="atal-delivery-segment" role="group" aria-label="Tamaño de letra">
        <button type="button" className={normalizedOptions.fontScale === 'large' ? 'is-active' : ''} onClick={() => updateOptions({ fontScale: 'large' })}>Letra grande</button>
        <button type="button" className={normalizedOptions.fontScale === 'extra-large' ? 'is-active' : ''} onClick={() => updateOptions({ fontScale: 'extra-large' })}>Letra extra grande</button>
      </div>
      <p className="atal-delivery-help">Atal nunca reducirá la letra para forzar el contenido en una sola página.</p>
    </section>}

    {normalizedOptions.mode === 'simple' && <section className="atal-delivery-section">
      <header><small>Paso 3</small><h2>Contenido</h2></header>
      <div className="atal-delivery-toggle-list">
        <Toggle checked={normalizedOptions.includeExercises} title="Incluir ejercicios" detail="Nombre, series y repeticiones o tiempo." onChange={(value) => updateOptions({ includeExercises: value })} />
        <Toggle disabled={!normalizedOptions.includeExercises} checked={normalizedOptions.includeRest} title="Incluir descansos" detail="Añade el descanso indicado junto a cada ejercicio." onChange={(value) => updateOptions({ includeRest: value })} />
      </div>
    </section>}

    {normalizedOptions.mode === 'session-log' && <>
      <section className="atal-delivery-section">
        <header><small>Paso 3</small><h2>Sesiones a registrar</h2></header>
        <div className="atal-delivery-session-count"><label><span>Cantidad de sesiones</span><input type="number" inputMode="numeric" min={1} max={99} value={normalizedOptions.sessionCount} onChange={(event) => updateOptions({ sessionCount: Number(event.target.value) })} /></label><small>De 1 a 99. No está ligado a semanas ni a fechas predeterminadas.</small></div>
        <div className="atal-delivery-presets" aria-label="Cantidades rápidas">{SESSION_PRESETS.map((value) => <button type="button" key={value} className={normalizedOptions.sessionCount === value ? 'is-active' : ''} onClick={() => updateOptions({ sessionCount: value })}>{value}</button>)}</div>
      </section>
      <section className="atal-delivery-section">
        <header><small>Paso 4</small><h2>Datos de cada sesión</h2></header>
        <div className="atal-delivery-toggle-list">
          <Toggle checked={normalizedOptions.includeExercises} title="Mostrar ejercicios del plan" detail="Incluye una leyenda compacta con la dosis." onChange={(value) => updateOptions({ includeExercises: value })} />
          <Toggle disabled={!normalizedOptions.includeExercises} checked={normalizedOptions.includeRest} title="Mostrar descansos" detail="Añade el descanso en la leyenda de ejercicios." onChange={(value) => updateOptions({ includeRest: value })} />
          <Toggle checked={normalizedOptions.logFields.date} title="Fecha abierta" detail="El paciente escribe cuándo realizó la sesión." onChange={(value) => updateLogField('date', value)} />
          <Toggle checked={normalizedOptions.logFields.overallCompletion} title="Casilla general de rutina completada" detail="Permite marcar la sesión completa de una sola vez." onChange={(value) => updateLogField('overallCompletion', value)} />
          <Toggle disabled={!normalizedOptions.includeExercises} checked={normalizedOptions.logFields.perExerciseCompletion} title="Casillas por ejercicio" detail="Permite indicar exactamente cuáles ejercicios se realizaron." onChange={(value) => updateLogField('perExerciseCompletion', value)} />
          <Toggle checked={normalizedOptions.logFields.painBefore} title="Dolor antes" detail="Escala de 0 a 10." onChange={(value) => updateLogField('painBefore', value)} />
          <Toggle checked={normalizedOptions.logFields.painAfter} title="Dolor después" detail="Escala de 0 a 10." onChange={(value) => updateLogField('painAfter', value)} />
          <Toggle checked={normalizedOptions.logFields.difficulty} title="Dificultad percibida" detail="Fácil, bien o difícil." onChange={(value) => updateLogField('difficulty', value)} />
          <Toggle checked={normalizedOptions.logFields.notes} title="Observaciones" detail="Espacio amplio para molestias o comentarios." onChange={(value) => updateLogField('notes', value)} />
        </div>
      </section>
    </>}

    {normalizedOptions.mode === 'detailed' && <section className="atal-delivery-section">
      <header><small>Paso 2</small><h2>Contenido detallado</h2></header>
      <p className="atal-delivery-help">Este formato conserva instrucciones, posición inicial, precauciones, material y notas clínicas. Puede ocupar varias páginas.</p>
      <div className="atal-delivery-toggle-list"><Toggle checked={normalizedOptions.includeImages} title="Incluir imágenes disponibles" detail="Las imágenes se procesan localmente. Video y formatos incompatibles usan un placeholder seguro." onChange={(value) => updateOptions({ includeImages: value })} /></div>
    </section>}

    {estimate && <section className="atal-delivery-estimate"><FileText /><div><small>Documento estimado</small><b>{estimate.summary}</b><p>{normalizedOptions.mode === 'simple' && estimate.pageCount === 1 ? 'Optimizado para una sola hoja sin reducir la letra.' : normalizedOptions.mode === 'session-log' ? 'Las sesiones se paginan automáticamente y cada registro permanece completo.' : 'Documento educativo completo, una sección amplia por ejercicio.'}</p></div></section>}

    <section className="atal-delivery-actions" aria-label="Acciones del documento">
      <button type="button" className="is-primary" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void download()}>{busy === 'download' ? <LoaderCircle className="is-spinning" /> : <Download />}<span><b>Descargar PDF</b><small>Archivo real para guardar</small></span></button>
      <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void share()}>{busy === 'share' ? <LoaderCircle className="is-spinning" /> : <Share2 />}<span><b>Compartir</b><small>Menú nativo del dispositivo</small></span></button>
      <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void print()}>{busy === 'print' ? <LoaderCircle className="is-spinning" /> : <Printer />}<span><b>Imprimir</b><small>Imprime el PDF generado</small></span></button>
    </section>

    {pdfResult?.omittedMedia.length ? <p className="atal-delivery-feedback"><AlertTriangle /> {pdfResult.omittedMedia.length} {pdfResult.omittedMedia.length === 1 ? 'imagen no pudo incluirse' : 'imágenes no pudieron incluirse'}; el documento se generó con placeholders seguros.</p> : null}
    {message && <p className="atal-action-message" role="status">{message}</p>}
    {error && <p className="atal-action-message is-error" role="alert">{error}</p>}
  </main></AtalShell>;
}

function Toggle({ checked, disabled, title, detail, onChange }: { checked: boolean; disabled?: boolean; title: string; detail: string; onChange: (value: boolean) => void }) {
  return <label className={`atal-delivery-toggle${disabled ? ' is-disabled' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span><b>{title}</b><small>{detail}</small></span><i aria-hidden="true" /></label>;
}
