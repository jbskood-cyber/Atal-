'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, Dumbbell, FilePlus2, Gauge, Save, Zap } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { trackingEntries } from '@/src/data/atal-demo';

export function ReportDetailScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const report = trackingEntries.find((entry) => entry.id === reportId) ?? trackingEntries[0];
  const [observations, setObservations] = useState('');
  const [saved, setSaved] = useState(false);
  return <AtalShell><main className="atal-content atal-flow-page atal-report-detail">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Detalle del reporte</span><button type="button">•••</button></div>
    <section className="atal-report-person"><Avatar name={report.patient} /><span><h1>{report.patient}</h1><small>Hoy, {report.time}</small></span><i className={`is-${report.status}`} /></section>
    <button type="button" className="atal-report-plan"><ClipboardList /><span>{report.plan}　•　Semana 4</span><ChevronRight /></button>
    <section className="atal-report-summary"><h2>Resumen del reporte</h2><ReportMetric icon={<Activity />} label="Dolor antes" detail="EVA 0–10" value={`${Math.min(report.pain + 3, 10)}/10`} tone="warning" /><ReportMetric icon={<Activity />} label="Dolor después" detail="EVA 0–10" value={`${report.pain}/10`} /><ReportMetric icon={<Zap />} label="Fatiga percibida" detail="EVA 0–10" value={`${report.fatigue}/10`} tone="warning" /><ReportMetric icon={<CheckCircle2 />} label="Adherencia al plan" detail="Sesiones completadas" value={`${report.adherence}%`} /><ReportMetric icon={<Dumbbell />} label="Ejercicios completados" detail="De 10 ejercicios" value="9/10" /></section>
    <section className="atal-report-comment"><h2>Comentario del paciente</h2><blockquote>“El dolor ha disminuido después de las sesiones. Sigo sintiendo rigidez por las mañanas, pero me siento mejor.”</blockquote></section>
    <section className="atal-observations"><h2>Observaciones del fisioterapeuta</h2><label><FilePlus2 /><textarea value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Agregar observaciones…" /></label><button type="button" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }}><Save /> {saved ? 'Observación guardada' : 'Guardar observación'}</button></section>
    <section className="atal-report-actions"><h2>Acciones</h2><button type="button" onClick={() => router.push('/plans/pl01')}><Gauge /> Actualizar plan <ChevronRight /></button><button type="button"><FilePlus2 /> Agregar nota <ChevronRight /></button></section>
  </main></AtalShell>;
}

function ReportMetric({ icon, label, detail, value, tone }: { icon: React.ReactNode; label: string; detail: string; value: string; tone?: string }) { return <div className="atal-report-metric"><span>{icon}</span><span><b>{label}</b><small>{detail}</small></span><strong className={tone ? `is-${tone}` : ''}>{value}</strong><ChevronRight /></div>; }
