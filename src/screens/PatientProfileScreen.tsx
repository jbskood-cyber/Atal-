'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  CalendarDays,
  ChevronRight,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  StickyNote,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { AvatarOrInitials, InlineAIRecommendation, MobileAppHeader, StatusBadge } from '@/src/components/native/NativeClinical';
import { archiveLocalPatient, restoreLocalPatient, updateLocalPatient, usePatientCatalog } from '@/src/data/localPatients';
import { addPatientNote, deletePatientNote, updatePatientNote, useAtalStore, type ActivityEvent, type PatientNote, type SessionRecord } from '@/src/data/atalStore';

type Tab = 'summary' | 'history' | 'notes' | 'metrics';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function planStatusLabel(status: 'draft' | 'active' | 'paused' | 'completed' | 'archived') {
  if (status === 'active') return 'Activo';
  if (status === 'draft') return 'En preparación';
  if (status === 'paused') return 'Pausado';
  if (status === 'completed') return 'Completado';
  return 'Archivado';
}

export function PatientProfileScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const catalog = usePatientCatalog();
  const patient = catalog.find((item) => item.id === patientId);
  const state = useAtalStore((store) => ({
    plans: store.plans.filter((item) => item.patientId === patientId),
    sessions: store.sessions.filter((item) => item.patientId === patientId),
    notes: store.notes.filter((item) => item.patientId === patientId),
    events: store.events.filter((item) => item.patientId === patientId),
    record: store.clinicalRecords.find((item) => item.patientId === patientId),
    settings: store.settings,
  }));
  const [tab, setTab] = useState<Tab>('summary');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: patient?.name ?? '',
    diagnosis: patient?.diagnosis ?? '',
    age: patient?.age?.toString() ?? '',
    birthDate: patient?.birthDate ?? '',
    sex: patient?.sex ?? '',
    affectedArea: patient?.affectedArea ?? '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (patient) setForm({
      name: patient.name,
      diagnosis: patient.diagnosis,
      age: patient.age?.toString() ?? '',
      birthDate: patient.birthDate,
      sex: patient.sex,
      affectedArea: patient.affectedArea,
    });
  }, [patient?.id, patient?.updatedAt]);

  if (!patient) return <AtalShell><main className="atal-content atal-flow-page"><div className="atal-panel-placeholder"><FileText /><h1>Paciente no encontrado</h1><button type="button" onClick={() => router.push('/patients')}>Volver</button></div></main></AtalShell>;

  const activePlan = state.plans.find((item) => item.status === 'active') ?? null;
  const currentPlan = activePlan
    ?? state.plans.find((item) => item.status === 'draft')
    ?? state.plans.find((item) => item.status === 'paused')
    ?? state.plans.find((item) => item.status === 'completed')
    ?? null;
  const sessions = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const events = [...state.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const notes = [...state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = sessions[0];
  const latestEvent = events[0];
  const latestNote = notes[0];

  const savePatient = () => {
    updateLocalPatient(patient.id, {
      name: form.name.trim(),
      diagnosis: form.diagnosis.trim(),
      age: form.age ? Number(form.age) : null,
      birthDate: form.birthDate,
      sex: form.sex,
      affectedArea: form.affectedArea,
    });
    setEditing(false);
    setMessage('Datos guardados.');
  };

  return <AtalShell onNew={() => router.push(`/plans/new?patientId=${patient.id}`)}><main className="atal-content atal-flow-page atal-patient-profile native-profile atal-profile-rescue">
    <MobileAppHeader
      title="Paciente"
      onBack={() => router.push('/patients')}
      actions={<button type="button" onClick={() => patient.status === 'archived' ? restoreLocalPatient(patient.id) : archiveLocalPatient(patient.id)} aria-label={patient.status === 'archived' ? 'Restaurar paciente' : 'Archivar paciente'}>{patient.status === 'archived' ? <RotateCcw /> : <Archive />}</button>}
    />

    <section className="native-profile__identity">
      <AvatarOrInitials id={patient.id} name={patient.name} size="lg" />
      <div><h1>{patient.name}</h1><p>{patient.affectedArea || patient.diagnosis || 'Motivo clínico por completar'}</p></div>
      <StatusBadge tone={patient.status === 'attention' ? 'attention' : patient.status === 'archived' ? 'neutral' : 'stable'}>{patient.status === 'archived' ? 'Archivado' : patient.status === 'attention' ? 'Atención' : 'Activo'}</StatusBadge>
    </section>

    <section className="atal-profile-facts" aria-label="Resumen del paciente">
      <span><small>Edad</small><b>{patient.age !== null ? `${patient.age} años` : 'Por completar'}</b></span>
      <span><small>Zona principal</small><b>{patient.affectedArea || 'Por completar'}</b></span>
      <span><small>Dolor actual</small><b>{latest ? `${latest.endPain}/10` : 'Sin registro'}</b></span>
      <span><small>Sesiones</small><b>{sessions.length}</b></span>
      <span><small>Última actividad</small><b>{latestEvent ? formatDate(latestEvent.createdAt) : 'Sin actividad'}</b></span>
      <span><small>Notas</small><b>{notes.length}</b></span>
    </section>

    <nav className="atal-tabbar">{([['summary', 'Resumen'], ['history', 'Historial'], ['notes', 'Notas'], ['metrics', 'Métricas']] as const).map(([value, label]) => <button type="button" key={value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {message && <p className="atal-action-message" role="status">{message}</p>}

    {tab === 'summary' && <div className="atal-profile-body">
      <button type="button" className="atal-patient-preview-cta" onClick={() => router.push(`/patients/${patient.id}/portal-preview`)}>
        <Eye />
        <span><b>Vista del paciente</b><small>{activePlan ? 'Consulta su plan y la sesión guiada' : currentPlan ? 'El plan todavía no está disponible para el paciente' : 'No tiene un plan disponible'}</small></span>
        <ChevronRight />
      </button>

      <section className="atal-profile-section atal-profile-clinical-summary">
        <div className="atal-section-title"><h2>Datos clínicos</h2><button type="button" onClick={() => setEditing((value) => !value)} aria-label={editing ? 'Cerrar edición' : 'Editar datos clínicos'}><Pencil /></button></div>
        {editing ? <div className="atal-settings-form">
          <label><span>Nombre</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span>Edad</span><input type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label>
          <label><span>Fecha de nacimiento</span><input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
          <label><span>Sexo</span><input value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })} /></label>
          <label><span>Motivo / diagnóstico</span><textarea value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} /></label>
          <label><span>Zona afectada</span><input value={form.affectedArea} onChange={(event) => setForm({ ...form, affectedArea: event.target.value })} /></label>
          <button type="button" className="atal-settings-save" onClick={savePatient}><Save />Guardar datos</button>
        </div> : <div className="atal-profile-clinical-copy">
          <span><small>Motivo clínico</small><b>{patient.diagnosis || 'Por completar'}</b></span>
          <span><small>Zona afectada</small><b>{patient.affectedArea || 'Por completar'}</b></span>
          <button type="button" onClick={() => router.push(`/patients/${patient.id}/clinical-record`)}><FileText /><span>Ver expediente</span><ChevronRight /></button>
        </div>}
      </section>

      <section className="atal-profile-section atal-profile-current-plan">
        <div className="atal-section-title"><h2>Plan actual</h2></div>
        {currentPlan ? <button type="button" className="atal-current-plan" onClick={() => router.push(`/plans/${currentPlan.id}`)}>
          <span className="atal-current-plan__icon"><CalendarDays /></span>
          <span className="atal-current-plan__copy"><b>{currentPlan.title}</b><small>{currentPlan.duration} · {currentPlan.frequency} · {currentPlan.exerciseIds.length} ejercicios</small><em>Abrir plan</em></span>
          <StatusBadge tone={currentPlan.status === 'active' ? 'stable' : currentPlan.status === 'paused' ? 'attention' : 'neutral'}>{planStatusLabel(currentPlan.status)}</StatusBadge>
          <ChevronRight />
        </button> : <div className="atal-empty atal-profile-plan-empty"><p>Este paciente todavía no tiene un plan.</p><button type="button" onClick={() => router.push(`/plans/new?patientId=${patient.id}`)}><Plus />Crear plan</button></div>}
      </section>

      <section className="atal-profile-section atal-profile-latest-report">
        <div className="atal-section-title"><h2>Último reporte</h2>{latest && <button type="button" onClick={() => router.push(`/activity?patientId=${patient.id}`)}>Ver todos</button>}</div>
        {latest ? <button type="button" className="atal-profile-compact-row" onClick={() => router.push(`/activity/${latest.id}`)}>
          <span><FileText /></span>
          <span><b>{latest.status === 'completed' ? 'Sesión completada' : 'Sesión parcial'}</b><small>{formatDate(latest.completedAt)} · Dolor final {latest.endPain}/10</small></span>
          <StatusBadge tone={latest.endPain >= 7 ? 'urgent' : latest.reviewedAt ? 'stable' : 'attention'}>{latest.reviewedAt ? 'Revisado' : 'Pendiente'}</StatusBadge>
          <ChevronRight />
        </button> : <p className="atal-profile-empty-copy">Todavía no hay sesiones registradas.</p>}
      </section>

      <section className="atal-profile-section atal-profile-latest-note">
        <div className="atal-section-title"><h2>Nota reciente</h2><button type="button" onClick={() => setTab('notes')}>{latestNote ? 'Ver todas' : 'Agregar'}</button></div>
        {latestNote ? <button type="button" className="atal-profile-compact-row" onClick={() => setTab('notes')}>
          <span><StickyNote /></span>
          <span><b>{latestNote.content}</b><small>{latestNote.professional} · {formatDate(latestNote.updatedAt)}</small></span>
          <ChevronRight />
        </button> : <p className="atal-profile-empty-copy">No hay notas clínicas todavía.</p>}
      </section>

      <InlineAIRecommendation
        title={currentPlan ? 'Revisar evolución del paciente' : 'Preparar un plan inicial'}
        detail={currentPlan ? latest ? `Última sesión: dolor ${latest.endPain}/10. Atal IA puede resumir el progreso.` : 'El plan todavía no tiene sesiones registradas.' : 'Usa el contexto de este paciente para preparar un borrador sin duplicarlo.'}
        action="Abrir Atal IA"
        onAction={() => router.push(`/assistant?patientId=${patient.id}${currentPlan ? `&planId=${currentPlan.id}` : ''}`)}
      />
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
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const save = () => {
    if (!value.trim()) return;
    if (editing) updatePatientNote(editing, value);
    else addPatientNote(patientId, value, professional);
    setValue('');
    setEditing(null);
  };
  return <section className="atal-profile-section atal-notes-panel"><h2>Notas clínicas</h2><textarea maxLength={1000} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Escribe una observación clínica…" /><small>{value.length}/1000</small><button type="button" disabled={!value.trim()} onClick={save}><Save />{editing ? 'Actualizar nota' : 'Guardar nota'}</button><div className="atal-note-history">{[...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((note) => <article key={note.id}><p>{note.content}</p><small>{note.professional} · {new Date(note.updatedAt).toLocaleString('es-MX')}</small><div><button type="button" onClick={() => { setEditing(note.id); setValue(note.content); }}><Pencil />Editar</button>{pendingDelete === note.id ? <><button type="button" onClick={() => { deletePatientNote(note.id); setPendingDelete(null); }}><Trash2 />Confirmar</button><button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button></> : <button type="button" onClick={() => setPendingDelete(note.id)}><Trash2 />Eliminar</button>}</div></article>)}{!notes.length && <p>No hay notas todavía.</p>}</div></section>;
}

function Metrics({ sessions, planId }: { sessions: SessionRecord[]; planId?: string }) {
  const relevant = planId ? sessions.filter((item) => item.planId === planId) : sessions;
  const completed = relevant.filter((item) => item.status === 'completed').length;
  const adherence = relevant.length ? Math.round(completed / relevant.length * 100) : null;
  const avgPain = relevant.length ? (relevant.reduce((sum, item) => sum + item.endPain, 0) / relevant.length).toFixed(1) : null;
  return <section className="atal-profile-section"><h2>Progreso del paciente</h2>{relevant.length ? <div className="atal-large-metrics"><span><strong>{completed}</strong><small>Sesiones completadas</small></span><span><strong>{adherence}%</strong><small>Adherencia</small></span><span><strong>{avgPain}/10</strong><small>Dolor final promedio</small></span><span><strong>{new Date(relevant[0].completedAt).toLocaleDateString('es-MX')}</strong><small>Última sesión</small></span></div> : <div className="atal-empty"><TrendingUp /><p>Las métricas aparecerán después de la primera sesión.</p></div>}</section>;
}
