'use client';

import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Clock3,
  Dumbbell,
  FileDown,
  FileText,
  Settings,
  Sparkles,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { useAtalStore } from '@/src/data/atalStore';

type AlertTone = 'urgent' | 'attention' | 'neutral';
type HomeAlert = {
  id: string;
  tone: AlertTone;
  title: string;
  detail: string;
  meta: string;
  href: string;
  icon: 'alert' | 'clock' | 'patient';
};

const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
}).format(new Date(value));

export function HomeScreen() {
  const router = useRouter();
  const state = useAtalStore((store) => store);
  const activePatients = state.patients.filter((patient) => patient.status !== 'archived');
  const activePlans = state.plans.filter((plan) => plan.status === 'active');
  const sortedSessions = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const pendingReports = sortedSessions.filter((session) => !session.reviewedAt);
  const patientsWithoutPlan = activePatients.filter((patient) => !state.plans.some((plan) => plan.patientId === patient.id && ['active', 'draft'].includes(plan.status)));

  const alerts: HomeAlert[] = [];
  for (const session of pendingReports) {
    const patient = state.patients.find((item) => item.id === session.patientId);
    const urgent = session.endPain >= 7 || session.symptoms.some((item) => !['ninguno', 'otro'].includes(item));
    alerts.push({
      id: `session-${session.id}`,
      tone: urgent ? 'urgent' : 'attention',
      title: urgent ? 'Sesión requiere atención' : 'Reporte pendiente',
      detail: `${patient?.name ?? 'Paciente'} · Dolor ${session.endPain}/10`,
      meta: formatDate(session.completedAt),
      href: `/activity/${session.id}`,
      icon: urgent ? 'alert' : 'clock',
    });
  }
  for (const patient of patientsWithoutPlan) {
    alerts.push({
      id: `patient-${patient.id}`,
      tone: 'neutral',
      title: 'Paciente sin plan',
      detail: `${patient.name} · ${patient.diagnosis || 'Motivo por completar'}`,
      meta: 'Revisar expediente',
      href: `/patients/${patient.id}`,
      icon: 'patient',
    });
  }

  const recentReports = sortedSessions.slice(0, 3);
  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <AtalShell>
      <main className="atal-content atal-home-v2">
        <header className="atal-home-heading">
          <h1>Hoy</h1>
          <p>Lo que necesita tu atención</p>
          <time>{today}</time>
        </header>

        <button type="button" className="atal-home-primary" onClick={() => router.push('/patients/new')}>
          <span><UserPlus /></span>
          <span><b>Nuevo paciente</b><small>Crear expediente y comenzar su seguimiento</small></span>
          <ChevronRight />
        </button>

        <section className="atal-home-metrics" aria-label="Resumen clínico">
          <HomeMetric icon={<UsersRound />} value={activePatients.length} label="Pacientes" onClick={() => router.push('/patients')} />
          <HomeMetric icon={<ClipboardList />} value={activePlans.length} label="Planes activos" onClick={() => router.push('/plans')} />
          <HomeMetric icon={<FileText />} value={pendingReports.length} label="Por revisar" onClick={() => router.push('/activity?view=reports')} attention={pendingReports.length > 0} />
        </section>

        <section className="atal-home-section">
          <SectionHeading title="Atención clínica" action="Ver todo" onClick={() => router.push('/activity')} />
          <div className="atal-home-list">
            {alerts.slice(0, 3).map((alert) => (
              <button type="button" key={alert.id} className={`atal-home-row is-${alert.tone}`} onClick={() => router.push(alert.href)}>
                <span className="atal-home-row-icon">{alert.icon === 'alert' ? <AlertTriangle /> : alert.icon === 'clock' ? <Clock3 /> : <UserRound />}</span>
                <span className="atal-home-row-copy"><b>{alert.title}</b><small>{alert.detail}</small><em>{alert.meta}</em></span>
                <ChevronRight />
              </button>
            ))}
            {!alerts.length && <div className="atal-home-empty"><b>Todo al día</b><small>No hay reportes pendientes ni pacientes sin plan.</small></div>}
          </div>
        </section>

        <section className="atal-home-section">
          <SectionHeading title="Reportes recientes" action="Ver todos" onClick={() => router.push('/activity?view=reports')} />
          <div className="atal-home-list">
            {recentReports.map((session) => {
              const patient = state.patients.find((item) => item.id === session.patientId);
              return (
                <button type="button" key={session.id} className={`atal-home-row is-${session.reviewedAt ? 'stable' : 'urgent'}`} onClick={() => router.push(`/activity/${session.id}`)}>
                  <span className="atal-home-row-icon"><FileText /></span>
                  <span className="atal-home-row-copy">
                    <b>{patient?.name ?? 'Paciente'}</b>
                    <small>{session.status === 'completed' ? 'Sesión completada' : 'Sesión parcial'}</small>
                    <em>{formatDate(session.completedAt)} · Dolor {session.endPain}/10 · {session.reviewedAt ? 'Revisado' : 'Pendiente'}</em>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
            {!recentReports.length && <div className="atal-home-empty"><b>Sin reportes todavía</b><small>Los reportes aparecerán al terminar una sesión guiada.</small></div>}
          </div>
        </section>

        <section className="atal-home-section atal-home-more">
          <h2>Más opciones</h2>
          <div>
            <QuickLink icon={<Dumbbell />} title="Ejercicios" detail="Biblioteca clínica" onClick={() => router.push('/exercises')} />
            <QuickLink icon={<FileDown />} title="Exportaciones" detail="Informes y respaldo" onClick={() => router.push('/exports')} />
            <QuickLink icon={<Settings />} title="Ajustes" detail="Preferencias de Atal" onClick={() => router.push('/settings')} />
            <QuickLink icon={<Sparkles />} title="Atal IA" detail="Operación asistida" onClick={() => router.push('/assistant')} />
          </div>
        </section>
      </main>
    </AtalShell>
  );
}

function HomeMetric({ icon, value, label, onClick, attention = false }: { icon: React.ReactNode; value: number; label: string; onClick: () => void; attention?: boolean }) {
  return <button type="button" onClick={onClick} className={attention ? 'is-attention' : ''}><span>{icon}</span><strong>{value}</strong><small>{label}</small></button>;
}

function SectionHeading({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return <div className="atal-home-section-heading"><h2>{title}</h2><button type="button" onClick={onClick}>{action}</button></div>;
}

function QuickLink({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span></button>;
}
