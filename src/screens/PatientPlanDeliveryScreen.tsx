'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  FileText,
  ImageOff,
  LoaderCircle,
  Printer,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { useAtalStore } from '@/src/data/atalStore';
import {
  buildPatientPlanDocument,
  getPatientPlanDeliveryEligibility,
  patientPlanStatusLabel,
} from '@/src/features/patient-delivery/buildPatientPlanDocument';
import {
  downloadPatientPlanPdf,
  printPatientPlan,
  sharePatientPlanPdf,
} from '@/src/features/patient-delivery/deliveryActions';
import { resolvePatientPlanMedia } from '@/src/features/patient-delivery/mediaResolver';
import { createPatientPlanPdf } from '@/src/features/patient-delivery/pdfRenderer';
import type { PatientPlanPdfResult, PatientPlanResolvedMedia } from '@/src/features/patient-delivery/types';
import '@/src/styles/atal-patient-delivery.css';

function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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
  const [media, setMedia] = useState<PatientPlanResolvedMedia[]>([]);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState<PatientPlanPdfResult | null>(null);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setConfirmed(false);
    setPdfResult(null);
    setMessage('');
    setError('');
  }, [planId, plan?.updatedAt]);

  useEffect(() => {
    if (!documentModel) { setMedia([]); setPreviewImages({}); return; }
    let cancelled = false;
    const urls: string[] = [];
    setMediaLoading(true);
    void resolvePatientPlanMedia(documentModel).then((resolved) => {
      if (cancelled) return;
      const images: Record<string, string> = {};
      for (const item of resolved) {
        if (!item.jpegBytes) continue;
        const url = URL.createObjectURL(new Blob([bytesToArrayBuffer(item.jpegBytes)], { type: 'image/jpeg' }));
        urls.push(url);
        images[item.exerciseId] = url;
      }
      setMedia(resolved);
      setPreviewImages(images);
    }).catch(() => {
      if (!cancelled) setMedia(documentModel.exercises.map((exercise) => ({ exerciseId: exercise.id, omittedReason: 'No pudimos preparar la vista previa multimedia.' })));
    }).finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [documentModel?.plan.id, documentModel?.plan.updatedAt]);

  if (!plan || !documentModel) {
    return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page"><div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div><section className="atal-delivery-state is-blocked"><AlertTriangle /><h1>No se puede generar este documento</h1><p>{eligibility.reason}</p><button type="button" onClick={() => router.back()}>Volver al plan</button></section></main></AtalShell>;
  }

  const actionsEnabled = !eligibility.requiresConfirmation || confirmed;

  const preparePdf = async () => {
    if (pdfResult) return pdfResult;
    const resolved = media.length === documentModel.exercises.length ? media : await resolvePatientPlanMedia(documentModel);
    const result = await createPatientPlanPdf(documentModel, resolved);
    if (!new TextDecoder('iso-8859-1').decode(result.bytes.slice(0, 8)).startsWith('%PDF-1.4')) throw new Error('El archivo generado no tiene una firma PDF válida.');
    setMedia(resolved);
    setPdfResult(result);
    return result;
  };

  const download = async () => {
    if (!actionsEnabled || busy) return;
    setBusy('download'); setMessage(''); setError('');
    try {
      const result = await preparePdf();
      const size = downloadPatientPlanPdf(result);
      setMessage(`PDF descargado correctamente · ${result.pageCount} páginas · ${Math.max(1, Math.round(size / 1024))} KB.`);
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
        : 'Este dispositivo no completó el envío; conservamos el documento mediante una descarga local.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos compartir el PDF.');
    } finally { setBusy(null); }
  };

  const print = () => {
    if (!actionsEnabled) { setError('Confirma el estado del plan antes de imprimirlo.'); return; }
    setError('');
    printPatientPlan();
  };

  const omittedCount = media.filter((item) => item.omittedReason).length;
  const status = patientPlanStatusLabel(documentModel.plan.status);

  return <AtalShell><main className="atal-content atal-flow-page atal-delivery-page">
    <div className="atal-flow-topbar no-print"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Entrega al paciente</span><i /></div>

    <section className="atal-delivery-heading no-print">
      <span><FileText /></span>
      <div><small>Documento clínico local</small><h1>Plan listo para entregar</h1><p>Vista previa, PDF real, impresión y compartir desde el dispositivo.</p></div>
    </section>

    <section className={`atal-delivery-safety no-print is-${eligibility.state}`}>
      {eligibility.state === 'ready' ? <ShieldCheck /> : <AlertTriangle />}
      <div><b>{eligibility.state === 'ready' ? 'Generación privada y local' : `Plan ${status.toLowerCase()}`}</b><p>{eligibility.reason} Los datos no se suben a un servidor.</p></div>
    </section>

    {eligibility.requiresConfirmation && <label className="atal-delivery-confirm no-print"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><b>Entiendo que este plan no está activo</b><small>El PDF mostrará claramente el estado “{status}” y no lo presentará como tratamiento vigente.</small></span><Check /></label>}

    <section className="atal-delivery-actions no-print" aria-label="Acciones del documento">
      <button type="button" className="is-primary" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void download()}>{busy === 'download' ? <LoaderCircle className="is-spinning" /> : <Download />}<span><b>Descargar PDF</b><small>Archivo real para guardar</small></span></button>
      <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={() => void share()}>{busy === 'share' ? <LoaderCircle className="is-spinning" /> : <Share2 />}<span><b>Compartir</b><small>WhatsApp, correo y más</small></span></button>
      <button type="button" disabled={!actionsEnabled || Boolean(busy)} onClick={print}><Printer /><span><b>Imprimir</b><small>Vista A4 del mismo contenido</small></span></button>
    </section>

    {mediaLoading && <p className="atal-delivery-feedback no-print"><LoaderCircle className="is-spinning" /> Preparando imágenes locales…</p>}
    {!mediaLoading && omittedCount > 0 && <p className="atal-delivery-feedback no-print"><ImageOff /> {omittedCount} {omittedCount === 1 ? 'ejercicio usará' : 'ejercicios usarán'} una presentación segura sin imagen.</p>}
    {message && <p className="atal-action-message no-print" role="status">{message}</p>}
    {error && <p className="atal-action-message is-error no-print" role="alert">{error}</p>}

    <article className="atal-delivery-document">
      <header className="atal-delivery-document-header"><AtalLogo /><div><small>Plan personalizado de fisioterapia</small><b>{documentModel.professional.clinic}</b></div><em className={documentModel.plan.status === 'active' ? 'is-active' : 'is-warning'}>{status}</em></header>
      <section className="atal-delivery-cover">
        <small>Plan para</small><h2>{documentModel.patient.name}</h2><h3>{documentModel.plan.title}</h3><p>{documentModel.patient.diagnosis} · {documentModel.patient.affectedArea}</p>
        <div className="atal-delivery-facts"><span><small>Duración</small><b>{documentModel.plan.duration}</b></span><span><small>Frecuencia</small><b>{documentModel.plan.frequency}</b></span><span><small>Ejercicios</small><b>{documentModel.exercises.length}</b></span></div>
        <div className="atal-delivery-copy"><h4>Objetivo</h4><p>{documentModel.plan.objective}</p></div>
        <div className="atal-delivery-guidance"><ShieldCheck /><div><h4>Indicaciones generales</h4><p>{documentModel.plan.generalInstructions}</p></div></div>
      </section>

      <section className="atal-delivery-exercises">
        <h3>Ejercicios en orden clínico</h3>
        {documentModel.exercises.map((exercise) => <article key={exercise.id} className="atal-delivery-exercise">
          <header><span>{String(exercise.order).padStart(2, '0')}</span><div><small>{exercise.region} · {exercise.category}</small><h4>{exercise.name}</h4><p>{exercise.objective}</p></div></header>
          <div className="atal-delivery-exercise-main">
            <figure>{previewImages[exercise.id] ? <img src={previewImages[exercise.id]} alt={`Demostración de ${exercise.name}`} /> : <span><ImageOff /><b>Imagen no disponible</b><small>Sigue las indicaciones escritas.</small></span>}</figure>
            <div><small>Dosis indicada</small><strong>{exercise.doseLabel}</strong><p><b>Posición:</b> {exercise.startingPosition}</p><p><b>Material:</b> {exercise.equipment}</p></div>
          </div>
          <ol>{exercise.instructions.map((instruction, index) => <li key={`${exercise.id}-${index}`}>{instruction}</li>)}</ol>
          <aside><AlertTriangle /><div><b>Precauciones</b><p>{exercise.precautions}{exercise.maxPain === null ? '' : ` Dolor máximo indicado: ${exercise.maxPain}/10.`}</p></div></aside>
          {exercise.therapistNotes && <blockquote>{exercise.therapistNotes}</blockquote>}
        </article>)}
      </section>

      <footer className="atal-delivery-document-footer"><div><b>{documentModel.professional.name}</b><span>{documentModel.professional.specialty} · {documentModel.professional.clinic}</span></div><small>Generado el {new Date(documentModel.generatedAt).toLocaleDateString('es-MX')} · Plan actualizado el {new Date(documentModel.plan.updatedAt).toLocaleDateString('es-MX')}</small><p>Detén el ejercicio y contacta a tu fisioterapeuta si los síntomas superan los límites indicados.</p></footer>
    </article>
  </main></AtalShell>;
}
