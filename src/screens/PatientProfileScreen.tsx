'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronRight, FileText, MessageCircle, Pencil, Plus, Target, TrendingUp } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { patients, type Patient } from '@/src/data/atal-demo';

type Tab = 'summary' | 'history' | 'notes' | 'metrics';

export function PatientProfileScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('summary');
  const [editing, setEditing] = useState(false);
  const [patient, setPatient] = useState<Patient>(() => patients.find((item) => item.id === patientId) ?? patients[0]);
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis);

  useEffect(() => {
    if (patientId !== 'p-new') return;
    const saved = window.sessionStorage.getItem('atal:new-patient');
    if (!saved) return;
    const draft = JSON.parse(saved) as Partial<Patient>;
    const created = { ...patients[0], ...draft, id: 'p-new', plan: 'Sin plan', progress: 0, adherence: 0, time: 'Ahora' };
    const timeoutId = setTimeout(() => {
      setPatient(created);
      setDiagnosis(created.diagnosis);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [patientId]);

  return (
    <AtalShell onNew={() => router.push('/plans/new')}>
      <main className="atal-content atal-flow-page atal-patient-profile">
        <div className="atal-flow-topbar">
          <button type="button" onClick={() => router.push('/patients')} aria-label="Volver a pacientes"><ArrowLeft /></button>
          <span>Expediente del paciente</span>
          <button type="button" aria-label="Más opciones">•••</button>
        </div>

        <section className="atal-profile-hero">
          <Avatar name={patient.name} size="lg" />
          <div><h1>{patient.name}</h1><p>29 años　•　Paciente demo</p><small>ID: {patient.id.toUpperCase()}</small></div>
        </section>

        <nav className="atal-tabbar" aria-label="Secciones del expediente">
          {([['summary', 'Resumen'], ['history', 'Historial'], ['notes', 'Notas'], ['metrics', 'Métricas']] as const).map(([value, label]) => (
            <button type="button" key={value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{label}</button>
          ))}
        </nav>

        {tab === 'summary' && <Summary patient={patient} diagnosis={diagnosis} editing={editing} setDiagnosis={setDiagnosis} onEdit={() => setEditing((value) => !value)} onPlan={() => router.push('/plans/pl01')} onCreatePlan={() => router.push('/plans/new')} />}
        {tab === 'history' && <History />}
        {tab === 'notes' && <Notes />}
        {tab === 'metrics' && <Metrics patient={patient} />}
      </main>
    </AtalShell>
  );
}

function Summary({ patient, diagnosis, editing, setDiagnosis, onEdit, onPlan, onCreatePlan }: { patient: Patient; diagnosis: string; editing: boolean; setDiagnosis: (value: string) => void; onEdit: () => void; onPlan: () => void; onCreatePlan: () => void }) {
  return <div className="atal-profile-body">
    <section className="atal-profile-section">
      <div className="atal-section-title"><h2>Diagnóstico / Motivo</h2><button type="button" onClick={onEdit} aria-label="Editar diagnóstico"><Pencil size={17} /></button></div>
      {editing ? <input className="atal-inline-edit" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} onBlur={onEdit} autoFocus /> : <><p className="atal-profile-lead">{diagnosis}</p><small>Seguimiento clínico demostrativo.</small></>}
    </section>
    <section className="atal-profile-section">
      <h2>Plan activo</h2>
      <button type="button" className="atal-active-plan" onClick={onPlan}><span><CalendarDays /></span><span><b>Rehabilitación — Fase 1</b><small>Inicio: 2 may · Sesiones: 3 / 12</small></span><em>En progreso</em><ChevronRight /></button>
    </section>
    <section className="atal-profile-section">
      <h2>Métricas clave</h2>
      <MetricRow icon={<Target />} label="Dolor (NPRS)" value="4 → 2 / 10" />
      <MetricRow icon={<TrendingUp />} label="Función (LEFS)" value="48 → 62 / 80" />
      <MetricRow icon={<TrendingUp />} label="Rango (Flexión)" value="110° → 126°" />
    </section>
    <section className="atal-profile-section">
      <div className="atal-section-title"><h2>Reportes recientes</h2><button type="button">Ver todo</button></div>
      <ReportRow title="Progreso funcional" date="Hoy, 8:45 a.m." />
      <ReportRow title="Reporte de evaluación" date="Ayer, 5:30 p.m." />
    </section>
    <div className="atal-profile-actions"><button type="button"><MessageCircle /> WhatsApp</button><button type="button"><FileText /> PDF</button><button type="button" className="is-primary" onClick={onCreatePlan}>Crear plan <Plus /></button></div>
  </div>;
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="atal-metric-row"><span>{icon}</span><b>{label}</b><strong>{value}</strong><i><span /><span /><span /><span /></i></div>; }
function ReportRow({ title, date }: { title: string; date: string }) { return <button type="button" className="atal-report-row"><span><FileText /></span><span><b>{title}</b><small>{date}</small></span><ChevronRight /></button>; }
function History() { return <div className="atal-panel-placeholder"><CalendarDays /><h2>Historial clínico</h2><p>Evaluación inicial, seguimientos y cambios del plan organizados cronológicamente.</p><button type="button">Registrar seguimiento</button></div>; }
function Notes() { const [value, setValue] = useState('Paciente con evolución favorable y buena tolerancia a la carga.'); return <div className="atal-profile-section atal-notes-panel"><h2>Notas clínicas</h2><textarea value={value} onChange={(event) => setValue(event.target.value)} /><small>{value.length}/500</small><button type="button">Guardar nota</button></div>; }
function Metrics({ patient }: { patient: Patient }) { return <div className="atal-profile-section"><h2>Progreso del paciente</h2><div className="atal-large-metrics"><span><strong>{patient.progress}%</strong><small>Progreso del plan</small></span><span><strong>{patient.adherence}%</strong><small>Adherencia</small></span><span><strong>2/10</strong><small>Dolor actual</small></span></div></div>; }
