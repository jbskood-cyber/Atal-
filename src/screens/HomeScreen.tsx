'use client';

import { AlertTriangle, CalendarDays, Check, ChevronRight, ClipboardList, FileText, Sparkles, UsersRound } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { patients, plans, statusColor } from '@/src/data/atal-demo';

const tasks = [
  { time: '9:30', meridiem: 'a.m.', title: 'Evaluación', person: 'Paciente Demo 04', detail: 'Caso demo · Telehealth', status: 'active' as const },
  { time: '11:30', meridiem: 'a.m.', title: 'Rehab', person: 'Paciente Demo 05', detail: 'Caso demo · Clínica', status: 'active' as const },
  { time: '2:00', meridiem: 'p.m.', title: 'Seguimiento', person: 'Paciente Demo 01', detail: 'Progreso semanal', status: 'attention' as const },
];

export function HomeScreen() {
  const activePatients = patients.filter((patient) => patient.status !== 'archived');
  const activePlans = plans.filter((plan) => plan.status === 'active');
  const alerts = patients.filter((patient) => patient.status === 'attention');

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
            <SectionHeading title="Hoy" />
            <div className="atal-patient-rows">
              {patients.slice(0, 4).map((patient) => <PatientRow key={patient.id} patient={patient} compact />)}
            </div>
          </section>
          <section className="atal-section atal-tasks">
            <SectionHeading title="Pendientes del día" />
            {tasks.map((task, index) => (
              <button key={task.time} type="button" className="atal-task-row">
                <span className="atal-task-dot" style={{ background: statusColor[task.status] }} />
                {index < tasks.length - 1 && <i />}
                <span className="atal-task-time"><strong>{task.time}</strong><small>{task.meridiem}</small></span>
                <span className="atal-task-copy"><span><b>{task.title}</b> · {task.person}</span><small>{task.detail}</small></span>
                <ChevronRight size={21} />
              </button>
            ))}
          </section>
        </div>

        <div className="atal-desktop-dashboard">
          <DashboardColumn title="Pacientes" count={activePatients.length} tabs={['Todos', 'Activos', 'Inactivos', 'Nuevos']}>
            {patients.slice(0, 5).map((patient) => <PatientRow key={patient.id} patient={patient} />)}
          </DashboardColumn>
          <DashboardColumn title="Planes" count={activePlans.length} tabs={['Todos', 'En curso', 'Por iniciar', 'Finalizados']}>
            {plans.slice(0, 5).map((plan, index) => (
              <button type="button" className="atal-dashboard-plan" key={plan.id}>
                <span className={`atal-plan-icon atal-plan-icon--${index % 4}`}><ClipboardList size={20} /></span>
                <span className="atal-dashboard-plan__copy"><b>{plan.title}</b><small>{plan.patient}</small><small>Inicio: 28 may, 2025</small></span>
                <span className="atal-plan-phase">{plan.phase}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </DashboardColumn>
          <DashboardColumn title="Reportes / Actividad" count={24} tabs={['Todos', 'Pendientes', 'Completados', 'Con IA']}>
            {['Evaluación progreso', 'Reevaluación funcional', 'Ajuste de plan', 'Informe de adherencia', 'Análisis con IA'].map((title, index) => (
              <button type="button" className="atal-activity-row" key={title}>
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

function SectionHeading({ title }: { title: string }) {
  return <div className="atal-section-heading"><h2>{title}</h2><button type="button">Ver todos <ChevronRight size={18} /></button></div>;
}

function PatientRow({ patient, compact = false }: { patient: (typeof patients)[number]; compact?: boolean }) {
  return (
    <button type="button" className={`atal-patient-row ${compact ? 'is-compact' : ''}`}>
      <Avatar name={patient.name} />
      <span className="atal-patient-row__copy"><b>{patient.name}</b><small>{compact ? patient.plan : patient.diagnosis}</small>{!compact && <small>{patient.adherence}% adherencia</small>}</span>
      <span className="atal-status-dot" style={{ background: statusColor[patient.status] }} />
      {compact ? <small className="atal-patient-time">{patient.time.replace('Hoy, ', '')}</small> : <strong className="atal-adherence">{patient.adherence}%</strong>}
      <ChevronRight size={20} />
    </button>
  );
}

function DashboardColumn({ title, count, tabs, children }: { title: string; count: number; tabs: string[]; children: React.ReactNode }) {
  return (
    <section className="atal-dashboard-column">
      <header><h2>{title} <small>{count}</small></h2><button type="button">Ver todos <ChevronRight size={16} /></button></header>
      <div className="atal-dashboard-tabs">{tabs.map((tab, index) => <button type="button" key={tab} className={index === 0 ? 'is-active' : ''}>{tab}</button>)}</div>
      <label className="atal-dashboard-search"><span>⌕</span><input placeholder={`Buscar ${title.toLowerCase()}...`} /></label>
      <div className="atal-dashboard-list">{children}</div>
      <footer>Mostrando 1–5 de {count}<span>‹　<b>1</b>　2　3　…　›</span></footer>
    </section>
  );
}
