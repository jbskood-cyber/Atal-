'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowLeft, CalendarDays, ChevronRight, Eye, FileText, Pencil, Plus, RotateCcw, Save, Trash2, TrendingUp } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { archiveLocalPatient, restoreLocalPatient, updateLocalPatient, usePatientCatalog } from '@/src/data/localPatients';
import { addPatientNote, deletePatientNote, updatePatientNote, useAtalStore, type ActivityEvent, type PatientNote, type SessionRecord } from '@/src/data/atalStore';
import { summarizeClinicalSessions } from '@/src/domain/clinicalMetrics';
import { validatePatientInput } from '@/src/domain/validation';

type Tab = 'summary' | 'history' | 'notes' | 'metrics';

export function PatientProfileScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const catalog = usePatientCatalog();
  const patient = catalog.find((item) => item.id === patientId);
  const state = useAtalStore((store) => ({
    plans: store.plans.filter((item) => item.patientId === patientId),
    sessions: store.sessions.filter((item) => item.patientId === patientId),
    notes: store.notes.filter((item) => item.patientId === patientId),
    events: store.events.filter((item) => item.patientId === patientId),
    settings: store.settings,
  }));
  const [tab, setTab] = useState<Tab>('summary');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: patient?.name ?? '', diagnosis: patient?.diagnosis ?? '', age: patient?.age?.toString() ?? '', birthDate: patient?.birthDate ?? '', sex: patient?.sex ?? '', affectedArea: patient?.affectedArea ?? '',
    phone: patient?.contact.phone ?? '', email: patient?.contact.email ?? '', address: patient?.contact.address ?? '', emergencyContact: patient?.contact.emergencyContact ?? '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!patient) return;
    setForm({
      name: patient.name, diagnosis: patient.diagnosis, age: patient.age?.toString() ?? '', birthDate: patient.birthDate, sex: patient.sex, affectedArea: patient.affectedArea,
      phone: patient.contact.phone, email: patient.contact.email, address: patient.contact.address, emergencyContact: patient.contact.emergencyContact,
    });
  }, [patient?.id, patient?.updatedAt]);

  if (!patient) return <AtalShell><main className="atal-content atal-flow-page"><div className="atal-panel-placeholder"><FileText /><h1>Paciente no encontrado</h1><button type="button" onClick={() => router.push('/patients')}>Volver</button></div></main></AtalShell>;

  const activePlan = state.plans.find((item) => item.status === 'active') ?? null;
  const archived = patient.status === 'archived';
  const savePatient = () => {
    const age = form.age ? Number(form.age) : null;
    const validation = validatePatientInput({ name: form.name, diagnosis: form.diagnosis, age });
    if (!validation.valid) { setMessage(Object.values(validation.errors)[0]); return; }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setMessage('Revisa el correo electrónico.'); return; }
    try {
      updateLocalPatient(patient.id, {
        name: form.name.trim(), diagnosis: form.diagnosis.trim(), age, birthDate: form.birthDate, sex: form.sex.trim(), affectedArea: form.affectedArea.trim(),
        contact: { phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), emergencyContact: form.emergencyContact.trim() },
      });
      setEditing(false);
      setMessage('Datos clínicos y de contacto guardados.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar los datos.');
    }
  };
  const toggleArchive = () => {
    if (archived) {
      restoreLocalPatient(patient.id);
      setMessage('Paciente restaurado. Los planes pausados permanecen pausados hasta revisión.');
    } else {
      archiveLocalPatient(patient.id);
      setMessage('Paciente archivado y plan activo pausado para proteger su tratamiento.');
    }
  };
  const recentSessions = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 3);

  return <AtalShell onNew={archived ? undefined : () => router.push(`/plans/new?patientId=${patient.id}`)}><main className="atal-content atal-flow-page atal-patient-profile">
    <div className="atal-flow-topbar"><button type="button" onClick={() => router.push('/patients')}><ArrowLeft /></button><span>Expediente del paciente</span><button type="button" onClick={toggleArchive} aria-label={archived ? 'Restaurar paciente' : 'Archivar paciente'}>{archived ? <RotateCcw /> : <Archive />}</button></div>
    <section className="atal-profile-hero"><Avatar name={patient.name} size="lg" /><div><h1>{patient.name}</h1><p>{patient.age !== null ? `${patient.age} años · ` : ''}{archived ? 'Archivado' : patient.status === 'attention' ? 'Requiere atención' : 'Paciente activo'}</p><small>ID: {patient.id.toUpperCase()}</small></div></section>
    <nav className="atal-tabbar">{([['summary', 'Resumen'], ['history', 'Historial'], ['notes', 'Notas'], ['metrics', 'Métricas']] as const).map(([value, label]) => <button type="button" key={value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {message && <p className="atal-action-message" role="status">{message}</p>}
    {tab === 'summary' && <div className="atal-profile-body">
      <button type="button" disabled={archived} className="atal-patient-preview-cta" onClick={() => router.push(`/patients/${patient.id}/portal-preview`)}><Eye /><span><b>Vista del paciente</b><small>{archived ? 'Restaura al paciente para abrir su plan' : activePlan ? 'Consulta su plan activo y sesión guiada' : 'No tiene un plan activo'}</small></span><ChevronRight /></button>
      <section className="atal-profile-section"><div className="atal-section-title"><h2>Datos clínicos y contacto</h2><button type="button" onClick={() => setEditing((value) => !value)}><Pencil /></button></div>{editing ? <div className="atal-settings-form">
        <label><span>Nombre</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Edad</span><input type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label><label><span>Fecha de nacimiento</span><input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label><label><span>Sexo</span><input value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })} /></label><label><span>Motivo / diagnóstico</span><textarea value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} /></label><label><span>Zona afectada</span><input value={form.affectedArea} onChange={(event) => setForm({ ...form, affectedArea: event.target.value })} /></label>
        <label><span>Teléfono</span><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label><span>Correo</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Dirección</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label><span>Contacto de emergencia</span><input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></label>
        <button type="button" className="atal-settings-save" onClick={savePatient}><Save />Guardar datos</button>
      </div> : <><p className="atal-profile-lead">{patient.diagnosis || 'Motivo por completar'}</p><small>{patient.affectedArea || 'Zona afectada por completar'}</small><p>{patient.contact.phone || patient.contact.email ? [patient.contact.phone, patient.contact.email].filter(Boolean).join(' · ') : 'Contacto por completar'}</p></>}</section>
      <section className="atal-profile-section"><h2>Plan activo</h2>{activePlan ? <button type="button" className="atal-active-plan" onClick={() => router.push(`/plans/${activePlan.id}`)}><span><CalendarDays /></span><span><b>{activePlan.title}</b><small>{activePlan.duration} · {activePlan.frequency}</small></span><em>Activo</em><ChevronRight /></button> : <div className="atal-empty"><p>{archived ? 'El paciente está archivado.' : 'Este paciente no tiene un plan activo.'}</p>{!archived && <button type="button" onClick={() => router.push(`/plans/new?patientId=${patient.id}`)}><Plus />Crear plan</button>}</div>}</section>
      <section className="atal-profile-section"><div className="atal-section-title"><h2>Reportes recientes</h2><button type="button" onClick={() => router.push(`/activity?view=reports&patientId=${patient.id}`)}>Ver todo</button></div>{recentSessions.map((session) => <button type="button" className="atal-report-row" key={session.id} onClick={() => router.push(`/activity/${session.id}`)}><span><FileText /></span><span><b>{session.status === 'completed' ? 'Sesión completada' : 'Sesión parcial'}</b><small>{new Date(session.completedAt).toLocaleString('es-MX')} · {session.reviewedAt ? 'Revisado' : 'Pendiente'}</small></span><ChevronRight /></button>)}{!recentSessions.length && <p>Sin sesiones registradas.</p>}</section>
      <div className="atal-profile-actions"><button type="button" onClick={() => router.push(`/patients/${patient.id}/clinical-record`)}><FileText />Ver expediente</button><button type="button" disabled={archived} className="is-primary" onClick={() => router.push(`/plans/new?patientId=${patient.id}`)}>Crear plan <Plus /></button></div>
    </div>}
    {tab === 'history' && <History events={state.events} />}
    {tab === 'notes' && <Notes patientId={patient.id} notes={state.notes} professional={state.settings.professionalName} />}
    {tab === 'metrics' && <Metrics sessions={state.sessions} planId={activePlan?.id} />}
  </main></AtalShell>;
}

function History({ events }: { events: ActivityEvent[] }) {
  return <section className="atal-profile-section"><h2>Historial cronológico</h2><div className="atal-history-list">{[...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((event) => <article key={event.id}><CalendarDays /><span><b>{event.title}</b><small>{event.detail}</small><time>{new Date(event.createdAt).toLocaleString('es-MX')}</time></span></article>)}{!events.length && <p>No hay eventos registrados.</p>}</div></section>;
}

function Notes({ patientId, notes, professional }: { patientId: string; notes: PatientNote[]; professional: string }) {
  const [value, setValue] = useState(''); const [editing, setEditing] = useState<string | null>(null); const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const save = () => { if (!value.trim()) return; if (editing) updatePatientNote(editing, value); else addPatientNote(patientId, value, professional); setValue(''); setEditing(null); };
  return <section className="atal-profile-section atal-notes-panel"><h2>Notas clínicas</h2><textarea maxLength={1000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Escribe una observación clínica…" /><small>{value.length}/1000</small><button type="button" disabled={!value.trim()} onClick={save}><Save />{editing ? 'Actualizar nota' : 'Guardar nota'}</button><div className="atal-note-history">{[...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((note) => <article key={note.id}><p>{note.content}</p><small>{note.professional} · {new Date(note.updatedAt).toLocaleString('es-MX')}</small><div><button type="button" onClick={() => { setEditing(note.id); setValue(note.content); }}><Pencil />Editar</button>{pendingDelete === note.id ? <><button type="button" onClick={() => { deletePatientNote(note.id); setPendingDelete(null); }}><Trash2 />Confirmar</button><button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button></> : <button type="button" onClick={() => setPendingDelete(note.id)}><Trash2 />Eliminar</button>}</div></article>)}{!notes.length && <p>No hay notas todavía.</p>}</div></section>;
}

function Metrics({ sessions, planId }: { sessions: SessionRecord[]; planId?: string }) {
  const relevant = planId ? sessions.filter((item) => item.planId === planId) : sessions;
  const summary = summarizeClinicalSessions(relevant);
  const painChange = summary.averagePainChange === null ? '—' : `${summary.averagePainChange > 0 ? '+' : ''}${summary.averagePainChange.toFixed(1)}`;
  return <section className="atal-profile-section"><h2>Progreso del paciente</h2>{summary.total ? <div className="atal-large-metrics"><span><strong>{summary.completed}</strong><small>Sesiones completadas</small></span><span><strong>{summary.adherence}%</strong><small>Adherencia</small></span><span><strong>{painChange}</strong><small>Cambio promedio de dolor</small></span><span><strong>{summary.pending}</strong><small>Reportes pendientes</small></span></div> : <div className="atal-empty"><TrendingUp /><p>Las métricas aparecerán después de la primera sesión.</p></div>}</section>;
}
