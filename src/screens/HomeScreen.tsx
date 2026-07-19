'use client';

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileDown,
  FileText,
  Plus,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { ClinicalListRow, GroupedList, MetricStrip, MobileAppHeader } from '@/src/components/native/NativeClinical';
import { usePatientCatalog } from '@/src/data/localPatients';
import { useAtalStore, type AppNotification } from '@/src/data/atalStore';

type AlertTone = AppNotification['severity'];
const alertRank: Record<AlertTone, number> = { urgent: 0, attention: 1, stable: 2 };

function relativeTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} d`;
}

function alertIcon(tone: AlertTone) {
  if (tone === 'urgent') return <AlertTriangle />;
  if (tone === 'attention') return <BellRing />;
  return <CheckCircle2 />;
}

export function HomeScreen() {
  const router = useRouter();
  const patients = usePatientCatalog();
  const state = useAtalStore((store) => ({
    plans: store.plans,
    sessions: store.sessions,
    notifications: store.notifications,
  }));
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const activePatients = patients.filter((patient) => patient.status !== 'archived');
  const activePlans = state.plans.filter((plan) => plan.status === 'active');
  const pendingReports = state.sessions.filter((session) => !session.reviewedAt);
  const alerts = [...state.notifications]
    .sort((a, b) => Number(a.read) - Number(b.read) || alertRank[a.severity] - alertRank[b.severity] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const recentReports = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 3);
  const date = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return <AtalShell><main className="atal-content native-home atal-home-rescue">
    <MobileAppHeader title="Hoy"><p>Lo que necesita tu atención</p></MobileAppHeader>
    <p className="native-home__date">{date}</p>

    <button type="button" className="atal-home-new-patient" onClick={() => router.push('/patients/new')}>
      <span><Plus /></span>
      <span><b>Nuevo paciente</b><small>Crear expediente y comenzar su seguimiento</small></span>
      <ChevronRight />
    </button>

    <MetricStrip items={[
      { icon: <UsersRound />, value: activePatients.length, label: 'Pacientes', onClick: () => router.push('/patients') },
      { icon: <ClipboardList />, value: activePlans.length, label: 'Planes activos', onClick: () => router.push('/plans') },
      { icon: <AlertTriangle />, value: pendingReports.length, label: 'Por revisar', tone: pendingReports.length ? 'attention' : 'stable', onClick: () => router.push('/activity?view=reports') },
    ]} />

    <GroupedList title="Alertas recientes" action={<button type="button" onClick={() => router.push('/activity')}>Ver todas</button>} className="atal-home-alerts">
      {alerts.map((alert) => <ClinicalListRow
        key={alert.id}
        leading={<span className={`native-row-icon is-${alert.severity}`}>{alertIcon(alert.severity)}</span>}
        title={alert.title}
        subtitle={alert.detail}
        meta={relativeTime(alert.createdAt)}
        tone={alert.severity}
        onClick={() => router.push(alert.href)}
      />)}
      {!alerts.length && <ClinicalListRow leading={<span className="native-row-icon is-stable"><CheckCircle2 /></span>} title="Todo bajo control" subtitle="No hay alertas clínicas recientes." tone="stable" />}
    </GroupedList>

    <GroupedList title="Reportes recientes" action={<button type="button" onClick={() => router.push('/activity?view=reports')}>Ver todos</button>} className="atal-home-reports">
      {recentReports.map((session) => {
        const patient = patientById.get(session.patientId);
        const pending = !session.reviewedAt;
        const tone = session.endPain >= 7 ? 'urgent' : pending ? 'attention' : 'stable';
        return <ClinicalListRow
          key={session.id}
          leading={<span className={`native-row-icon is-${tone}`}><FileText /></span>}
          title={patient?.name ?? 'Paciente'}
          subtitle={session.status === 'completed' ? 'Sesión completada' : 'Sesión parcial'}
          meta={`${new Date(session.completedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · Dolor ${session.endPain}/10 · ${pending ? 'Pendiente' : 'Revisado'}`}
          tone={tone}
          onClick={() => router.push(`/activity/${session.id}`)}
        />;
      })}
      {!recentReports.length && <ClinicalListRow leading={<span className="native-row-icon"><FileText /></span>} title="Sin reportes recientes" subtitle="Los reportes aparecerán cuando un paciente complete una sesión." />}
    </GroupedList>

    <section className="atal-home-more" aria-labelledby="atal-home-more-title">
      <header><h2 id="atal-home-more-title">Más opciones</h2></header>
      <div>
        <button type="button" onClick={() => router.push('/exercises')}><span><Dumbbell /></span><b>Ejercicios</b><small>Biblioteca clínica</small></button>
        <button type="button" onClick={() => router.push('/exports')}><span><FileDown /></span><b>Exportaciones</b><small>Informes y respaldo</small></button>
        <button type="button" onClick={() => router.push('/settings')}><span><Settings /></span><b>Ajustes</b><small>Preferencias de Atal</small></button>
        <button type="button" onClick={() => router.push('/assistant')}><span><Sparkles /></span><b>Atal IA</b><small>Operación asistida</small></button>
      </div>
    </section>
  </main></AtalShell>;
}
