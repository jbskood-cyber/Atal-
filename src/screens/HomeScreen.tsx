'use client';

import { Activity, AlertTriangle, BellRing, ClipboardList, FileText, Plus, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { AvatarOrInitials, ClinicalListRow, GroupedList, InlineAIRecommendation, MetricStrip, MobileAppHeader, PriorityBanner, StatusBadge } from '@/src/components/native/NativeClinical';
import { usePatientCatalog } from '@/src/data/localPatients';
import { useAtalStore } from '@/src/data/atalStore';

type Priority = 'urgent' | 'attention' | 'stable';
const rank: Record<Priority, number> = { urgent: 0, attention: 1, stable: 2 };

export function HomeScreen() {
  const router = useRouter();
  const patients = usePatientCatalog();
  const state = useAtalStore((store) => ({ plans: store.plans, sessions: store.sessions, events: store.events }));
  const activePatients = patients.filter((patient) => patient.status !== 'archived');
  const activePlans = state.plans.filter((plan) => plan.status === 'active');
  const pendingReports = state.sessions.filter((session) => !session.reviewedAt);
  const priorities = activePatients.map((patient) => {
    const sessions = state.sessions.filter((session) => session.patientId === patient.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const latest = sessions[0];
    const plan = activePlans.find((item) => item.patientId === patient.id);
    const hasAlertSymptom = latest?.symptoms.some((symptom) => !['ninguno', 'otro'].includes(symptom));
    const priority: Priority = latest && (latest.endPain >= 7 || hasAlertSymptom) ? 'urgent' : patient.status === 'attention' || (latest && !latest.reviewedAt) || (plan && !latest) ? 'attention' : 'stable';
    return { patient, latest, plan, priority };
  }).sort((a, b) => rank[a.priority] - rank[b.priority]);
  const lead = priorities[0];
  const events = state.events.slice(0, 5);
  const date = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const recommendation = pendingReports.length
    ? { title: 'Revisa los reportes pendientes', detail: `${pendingReports.length} ${pendingReports.length === 1 ? 'sesión requiere' : 'sesiones requieren'} revisión clínica.`, action: 'Abrir actividad', href: '/activity?view=reports' }
    : activePatients.some((patient) => !activePlans.some((plan) => plan.patientId === patient.id))
      ? { title: 'Hay pacientes sin plan activo', detail: 'Prepara el siguiente plan desde Atal IA o el constructor manual.', action: 'Crear plan', href: '/plans/new' }
      : { title: 'La jornada está al día', detail: 'Puedes consultar evolución o preparar la próxima sesión.', action: 'Abrir Atal IA', href: '/assistant' };

  return <AtalShell><main className="atal-content native-home">
    <MobileAppHeader title="Hoy" eyebrow="Atal Fisioterapia" actions={<button type="button" className="native-icon-button" onClick={() => router.push('/patients/new')} aria-label="Crear paciente"><Plus /></button>} />
    <p className="native-home__date">{date}</p>
    {lead ? <PriorityBanner
      tone={lead.priority}
      eyebrow={lead.priority === 'urgent' ? 'Alta prioridad' : lead.priority === 'attention' ? 'Requiere atención' : 'Evolución estable'}
      title={lead.patient.name}
      detail={lead.latest ? `${lead.patient.diagnosis || 'Seguimiento clínico'} · Dolor final ${lead.latest.endPain}/10` : `${lead.patient.diagnosis || 'Motivo por completar'} · ${lead.plan ? 'Plan activo sin sesiones' : 'Sin plan activo'}`}
      metric={lead.plan ? `${lead.patient.progress}%` : undefined}
      action={lead.latest && !lead.latest.reviewedAt ? 'Revisar reporte' : lead.plan ? 'Abrir paciente' : 'Crear plan'}
      onAction={() => router.push(lead.latest && !lead.latest.reviewedAt ? `/activity/${lead.latest.id}` : lead.plan ? `/patients/${lead.patient.id}` : `/plans/new?patientId=${lead.patient.id}`)}
      avatar={<AvatarOrInitials id={lead.patient.id} name={lead.patient.name} />}
    /> : <PriorityBanner tone="stable" eyebrow="Sin alertas" title="Comienza tu jornada" detail="Crea el primer paciente para activar el seguimiento clínico." action="Nuevo paciente" onAction={() => router.push('/patients/new')} />}

    <MetricStrip items={[
      { icon: <UsersRound />, value: activePatients.length, label: 'Pacientes', onClick: () => router.push('/patients') },
      { icon: <ClipboardList />, value: activePlans.length, label: 'Planes activos', onClick: () => router.push('/plans') },
      { icon: <AlertTriangle />, value: pendingReports.length, label: 'Por revisar', tone: pendingReports.length ? 'attention' : 'stable', onClick: () => router.push('/activity?view=reports') },
    ]} />

    <GroupedList title="Actividad de hoy" action={<button type="button" onClick={() => router.push('/activity')}>Ver todo</button>}>
      {events.map((event) => <ClinicalListRow key={event.id} leading={<span className="native-row-icon"><Activity /></span>} title={event.title} subtitle={event.detail} meta={new Date(event.createdAt).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })} onClick={() => router.push(event.sessionId ? `/activity/${event.sessionId}` : event.patientId ? `/patients/${event.patientId}` : '/activity')} trailing={<StatusBadge tone="stable">Registrado</StatusBadge>} />)}
      {!events.length && <ClinicalListRow leading={<BellRing />} title="Sin actividad todavía" subtitle="Las acciones clínicas aparecerán aquí." />}
    </GroupedList>

    <InlineAIRecommendation title={recommendation.title} detail={recommendation.detail} action={recommendation.action} onAction={() => router.push(recommendation.href)} />
    <GroupedList title="Pendientes clínicos">
      {pendingReports.slice(0, 3).map((session) => <ClinicalListRow key={session.id} leading={<span className="native-row-icon is-attention"><FileText /></span>} title={patients.find((patient) => patient.id === session.patientId)?.name ?? 'Paciente'} subtitle={session.status === 'completed' ? 'Sesión completada sin revisar' : 'Sesión parcial pendiente'} meta={`Dolor final ${session.endPain}/10`} tone={session.endPain >= 7 ? 'urgent' : 'attention'} onClick={() => router.push(`/activity/${session.id}`)} />)}
      {!pendingReports.length && <ClinicalListRow leading={<span className="native-row-icon"><FileText /></span>} title="Sin reportes pendientes" subtitle="Todo el seguimiento registrado está revisado." />}
    </GroupedList>
  </main></AtalShell>;
}
