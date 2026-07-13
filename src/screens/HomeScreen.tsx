'use client';

import { AlertTriangle, CalendarDays, Check, ChevronRight, ClipboardList, FileText, Sparkles, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { patients, plans, statusColor } from '@/src/data/atal-demo';

const tasks = [
  { time: '9:30', minutes: 570, meridiem: 'a.m.', title: 'Evaluación', person: 'Paciente Demo 04', detail: 'Caso demo · Telehealth', priority: 'stable' as const },
  { time: '11:30', minutes: 690, meridiem: 'a.m.', title: 'Rehab', person: 'Paciente Demo 05', detail: 'Caso demo · Clínica', priority: 'attention' as const },
  { time: '2:00', minutes: 840, meridiem: 'p.m.', title: 'Seguimiento', person: 'Paciente Demo 02', detail: 'Dolor 7/10 · Revisar hoy', priority: 'urgent' as const },
];

const priorityRank = { urgent: 0, attention: 1, stable: 2 } as const;
const priorityColor = { urgent: '#dc3f45', attention: '#f4a61d', stable: '#16a36a' } as const;
const priorityLabel = { urgent: 'Urgente', attention: 'Requiere atención', stable: 'Estable' } as const;

export function HomeScreen() {
  const router = useRouter();
  const activePatients = patients.filter((patient) => patient.status !== 'archived');
  const activePlans = plans.filter((plan) => plan.status === 'active');
  const alerts = patients.filter((patient) => patient.status === 'attention');
  const todayPatients = patients.slice(0, 6).map((patient, order) => ({ ...patient, order, priority: patient.id === 'p02' ? 'urgent' as const : patient.status === 'attention' ? 'attention' as const : 'stable' as const })).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.order - b.order).slice(0, 4);
  const orderedTasks = [...tasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.minutes - b.minutes);

  return (
    <AtalShell>
      <main className="atal-content atal-home">
        <h1 className="atal-mobile-page-title">Inicio</h1>
        <section className="atal-mobile-metrics">
          <MobileMetric icon={<UsersRound />} value={patients.length} label="Pacientes" />
          <MobileMetric icon={<ClipboardList />} value={activePlans.length} label="Planes" />
          <MobileMetric icon={<AlertTriangle />} value={alerts.length} label="Alertas" />
        </section>

        <section className="atal-desktop-metrics">
          <DesktopMetric icon={<UsersRound />} value={activePatients.length} label="Pacientes activos" trend="↑ 12% vs. semana anterior" />
          <DesktopMetric icon={<ClipboardList />} value={activePlans.length} label="Planes en curso" trend="↑ 8% vs. semana anterior" />
          <DesktopMetric icon={<FileText />} value={alerts.length} label="Reportes pendientes" trend="↓ 5% vs. semana anterior" warning />
          <DesktopMetric icon={<Sparkles />} value="2,450" label="Créditos IA" trend="Válidos hasta 28 may, 2025" />
        </section>

        <div className="atal-mobile-home-flow">
          <section className="atal-section">
            <SectionHeading title="Hoy" onClick={() => router.push('/patients')} />
            <div className="atal-patient-rows">
              {todayPatients.map((patient) => <PatientRow key={patient.id} patient={patient} compact priority={patient.priority} onClick={() => router.push(`/patients/${patient.id}`)} />)}
            </div>
          </section>
          <section className="atal-section atal-tasks">
            <SectionHeading title="Pendientes del día" onClick={() => router.push('/activity')} />
            {orderedTasks.map((task, index) => (
              <button key={task.time} type="button" className={`atal-task-row is-${task.priority}`} aria-label={`${priorityLabel[task.priority]}: ${task.title} de ${task.person} a las ${task.time} ${task.meridiem}`} onClick={() => router.push(task.priority === 'urgent' ? '/activity/p02' : '/activity')}>
                <span className="atal-task-dot" style={{ background: priorityColor[task.priority] }} />
                {index < orderedTasks.length - 1 && <i />}
                <span className="atal-task-time"><strong>{task.time}</strong><small>{task.meridiem}</small></span>
                <span className="atal-task-copy"><span><b>{task.title}</b> · {task.person}</span><small>{task.detail}</small></span>
                <ChevronRight size={21} />
              </button>
            ))}
          </section>
        </div>

        <div className="atal-desktop-dashboard">
          <DashboardColumn title="Pacientes" count={activePatients.length} tabs={['Todos', 'Activos', 'Inactivos', 'Nuevos']} onViewAll={() => router.push('/patients')}>
            {patients.slice(0, 5).map((patient) => <PatientRow key={patient.id} patient={patient} onClick={() => router.push(`/patients/${patient.id}`)} />)}
          </DashboardColumn>
          <DashboardColumn title="Planes" count={activePlans.length} tabs={['Todos', 'En curso', 'Por iniciar', 'Finalizados']} onViewAll={() => router.push('/plans')}>
            {plans.slice(0, 5).map((plan, index) => (
              <button type="button" className="atal-dashboard-plan" key={plan.id} onClick={() => router.push(`/plans/${plan.id}`)}>
                <span className={`atal-plan-icon atal-plan-icon--${index % 4}`}><ClipboardList size={20} /></span>
                <span className="atal-dashboard-plan__copy"><b>{plan.title}</b><small>{plan.patient}</small><small>Inicio: 28 may, 2025</small></span>
                <span className="atal-plan-phase">{plan.phase}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </DashboardColumn>
          <DashboardColumn title="Reportes / Actividad" count={24} tabs={['Todos', 'Pendientes', 'Completados', 'Con IA']} onViewAll={() => router.push('/activity')}>
            {['Evaluación progreso', 'Reevaluación funcional', 'Ajuste de plan', 'Informe de adherencia', 'Análisis con IA'].map((title, index) => (
              <button type="button" className="atal-activity-row" key={title} onClick={() => router.push('/activity')}>
                <span className={index === 1 || index === 3 ? 'is-done' : ''}>{index === 1 || index === 3 ? <Check size={19} /> : index === 4 ? <Sparkles size={19} /> : <FileText size={19} />}</span>
                <span><b>{title}</b><small>Paciente Demo 0{index + 1}</small></span>
                <em className={index % 2 ? 'is-complete' : ''}>{index % 2 ? 'Completado' : 'Pendiente'}</em>
              </button>
            ))}
          </DashboardColumn>
        </div>
      </main>
    </AtalShell>
  );
}

function MobileMetric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function DesktopMetric({ icon, value, label, trend, warning }: { icon: React.ReactNode; value: string | number; label: string; trend: string; warning?: boolean }) {
  return <div className={`atal-desktop-metric ${warning ? 'is-warning' : ''}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{trend}</em></div></div>;
}

function SectionHeading({ title, onClick }: { title: string; onClick: () => void }) {
  return <div className="atal-section-heading"><h2>{title}</h2><button type="button" onClick={onClick}>Ver todos <ChevronRight size={18} /></button></div>;
}

function PatientRow({ patient, compact = false, priority, onClick }: { patient: (typeof patients)[number]; compact?: boolean; priority?: keyof typeof priorityRank; onClick: () => void }) {
  return (
    <button type="button" className={`atal-patient-row ${compact ? 'is-compact' : ''} ${priority ? `is-${priority}` : ''}`} aria-label={priority ? `${priorityLabel[priority]}: ${patient.name}, ${patient.plan}` : undefined} onClick={onClick}>
      <Avatar name={patient.name} />
      <span className="atal-patient-row__copy"><b>{patient.name}</b><small>{compact ? patient.plan : patient.diagnosis}</small>{!compact && <small>{patient.adherence}% adherencia</small>}</span>
      <span className="atal-status-dot" title={priority ? priorityLabel[priority] : patient.status} style={{ background: priority ? priorityColor[priority] : statusColor[patient.status] }} />
      {compact ? <small className="atal-patient-time">{patient.time.replace('Hoy, ', '')}</small> : <strong className="atal-adherence">{patient.adherence}%</strong>}
      <ChevronRight size={20} />
    </button>
  );
}

function DashboardColumn({ title, count, tabs, children, onViewAll }: { title: string; count: number; tabs: string[]; children: React.ReactNode; onViewAll: () => void }) {
  return (
    <section className="atal-dashboard-column">
      <header><h2>{title} <small>{count}</small></h2><button type="button" onClick={onViewAll}>Ver todos <ChevronRight size={16} /></button></header>
      <div className="atal-dashboard-tabs">{tabs.map((tab, index) => <span key={tab} className={index === 0 ? 'is-active' : ''}>{tab}</span>)}</div>
      <label className="atal-dashboard-search"><span>⌕</span><input placeholder={`Buscar ${title.toLowerCase()}...`} /></label>
      <div className="atal-dashboard-list">{children}</div>
      <footer>Mostrando 1–5 de {count}<span>‹　<b>1</b>　2　3　…　›</span></footer>
    </section>
  );
}
