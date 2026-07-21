'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, FileText, Filter, Search, TrendingUp } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { useAtalStore, type ActivityEvent } from '@/src/data/atalStore';
import { sessionNeedsAttention, summarizeClinicalSessions } from '@/src/domain/clinicalMetrics';

type View = 'tracking' | 'reports';

function eventDestination(event: ActivityEvent) {
  if (event.sessionId) return `/activity/${event.sessionId}`;
  if (event.planId) return `/plans/${event.planId}`;
  if (event.patientId) return `/patients/${event.patientId}`;
  return '/activity';
}

export function ActivityScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const patientFilter = params.get('patientId') ?? '';
  const requestedView: View = params.get('view') === 'reports' ? 'reports' : 'tracking';
  const [view, setView] = useState<View>(requestedView);
  const [query, setQuery] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const state = useAtalStore((store) => ({ sessions: store.sessions, patients: store.patients, plans: store.plans, events: store.events }));
  const summary = useMemo(() => summarizeClinicalSessions(patientFilter ? state.sessions.filter((session) => session.patientId === patientFilter) : state.sessions), [state.sessions, patientFilter]);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => setView(requestedView), [requestedView]);

  const reports = useMemo(() => summary.sessions.filter((session) => {
    const patient = state.patients.find((item) => item.id === session.patientId);
    const plan = state.plans.find((item) => item.id === session.planId);
    const text = `${patient?.name ?? ''} ${patient?.diagnosis ?? ''} ${plan?.title ?? ''}`.toLowerCase();
    return (!pendingOnly || !session.reviewedAt) && text.includes(normalizedQuery);
  }), [summary.sessions, state.patients, state.plans, pendingOnly, normalizedQuery]);

  const timeline = useMemo(() => [...state.events]
    .filter((event) => !patientFilter || event.patientId === patientFilter)
    .filter((event) => {
      const patient = state.patients.find((item) => item.id === event.patientId);
      const plan = state.plans.find((item) => item.id === event.planId);
      return `${event.title} ${event.detail} ${patient?.name ?? ''} ${plan?.title ?? ''}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state.events, state.patients, state.plans, patientFilter, normalizedQuery]);

  const changeView = (next: View) => {
    setView(next);
    const patient = patientFilter ? `&patientId=${encodeURIComponent(patientFilter)}` : '';
    router.replace(`/activity?view=${next}${patient}`, { scroll: false });
  };

  return <AtalShell><main className="atal-content atal-list-page atal-activity-page">
    <div className="atal-page-heading"><div><span className="atal-eyebrow">Centro clínico</span><h1>Actividad</h1></div></div>
    <div className="atal-view-switch"><button type="button" className={view === 'tracking' ? 'is-active' : ''} onClick={() => changeView('tracking')}><Activity />Seguimiento</button><button type="button" className={view === 'reports' ? 'is-active' : ''} onClick={() => changeView('reports')}><FileText />Reportes</button></div>
    <label className="atal-premium-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'tracking' ? 'Buscar evento, paciente o plan' : 'Buscar paciente o plan'} />{view === 'reports' && <button type="button" className={pendingOnly ? 'is-active' : ''} aria-label="Mostrar solo pendientes" onClick={() => setPendingOnly((value) => !value)}><Filter /></button>}</label>
    <section className="atal-activity-summary"><article><span><TrendingUp /></span><div><small>Adherencia registrada</small><strong>{summary.adherence === null ? '—' : `${summary.adherence}%`}</strong><em>{summary.total ? `${summary.total} sesiones` : 'Sin sesiones'}</em></div></article><article><span className="is-warm"><ClipboardCheck /></span><div><small>Por revisar</small><strong>{summary.pending}</strong><em>{summary.attention ? `${summary.attention} requieren atención` : 'Sin alertas clínicas'}</em></div></article></section>
    <div className="atal-list-meta"><b>{view === 'tracking' ? 'Historial clínico' : 'Reportes de sesión'}</b><span>{view === 'tracking' ? timeline.length : reports.length} resultados</span></div>
    <div className="atal-activity-feed">
      {view === 'tracking' ? timeline.map((event) => {
        const patient = state.patients.find((item) => item.id === event.patientId);
        const plan = state.plans.find((item) => item.id === event.planId);
        return <button type="button" key={event.id} onClick={() => router.push(eventDestination(event))}><Avatar name={patient?.name ?? 'Atal'} /><span><b>{event.title}</b><small>{patient?.name ?? 'Actividad general'}{plan ? ` · ${plan.title}` : ''}</small><em>{event.detail}{event.origin === 'atal-ai' ? ' · Atal IA' : ''}</em></span><time><CalendarDays />{new Date(event.createdAt).toLocaleDateString('es-MX')}</time><i /><ChevronRight /></button>;
      }) : reports.map((session) => {
        const patient = state.patients.find((item) => item.id === session.patientId);
        const plan = state.plans.find((item) => item.id === session.planId);
        const attention = sessionNeedsAttention(session);
        return <button type="button" key={session.id} onClick={() => router.push(`/activity/${session.id}`)}><Avatar name={patient?.name ?? 'Paciente'} /><span><b>{patient?.name ?? 'Paciente no disponible'}</b><small>{plan?.title ?? 'Plan histórico'} · {session.status === 'completed' ? 'Completada' : 'Parcial'}</small><em>Dolor {session.startPain}/10 → {session.endPain}/10 · {session.reviewedAt ? 'Revisado' : 'Pendiente'}</em></span><time><CalendarDays />{new Date(session.completedAt).toLocaleDateString('es-MX')}</time><i className={attention ? 'is-attention' : ''} /><ChevronRight /></button>;
      })}
    </div>
    {view === 'tracking' && !timeline.length && <div className="atal-empty"><Activity /><p>No hay eventos que coincidan. La actividad aparecerá al crear pacientes, actualizar expedientes, gestionar planes y completar sesiones.</p></div>}
    {view === 'reports' && !reports.length && <div className="atal-empty"><FileText /><p>No hay reportes que coincidan. Completa una sesión guiada para generar uno.</p></div>}
  </main></AtalShell>;
}
