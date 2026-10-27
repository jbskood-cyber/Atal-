'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, FileText, Filter, Search, TrendingUp } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { useAtalStore, type ActivityEvent } from '@/src/data/atalStore';
import { sessionNeedsAttention, summarizeClinicalSessions } from '@/src/domain/clinicalMetrics';
import { buildActivityIndex, filterActivityTimeline } from '@/src/domain/queries/activityIndex';

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
  const [restoredScope, setRestoredScope] = useState<string | null>(null);
  const viewKey = `atal:activity-list-view:v1:${patientFilter || 'all'}`;
  const state = useAtalStore((store) => ({ sessions: store.sessions, patients: store.patients, plans: store.plans, events: store.events }));
  const activityIndex = useMemo(() => buildActivityIndex(state), [state.patients, state.plans]);
  const summary = useMemo(() => summarizeClinicalSessions(patientFilter ? state.sessions.filter((session) => session.patientId === patientFilter) : state.sessions), [state.sessions, patientFilter]);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => setView(requestedView), [requestedView]);

  // Retain only local presentation preferences for this patient scope. No
  // clinical records or contact fields are written outside Atal's store.
  useEffect(() => {
    let saved: unknown = null;
    try { saved = JSON.parse(window.sessionStorage.getItem(viewKey) ?? 'null'); } catch {}
    const next = saved && typeof saved === 'object' ? saved as { query?: unknown; pendingOnly?: unknown } : {};
    setQuery(typeof next.query === 'string' && next.query.length <= 200 ? next.query : '');
    setPendingOnly(typeof next.pendingOnly === 'boolean' ? next.pendingOnly : false);
    setRestoredScope(viewKey);
    let scroll = 0;
    try { scroll = Number(window.sessionStorage.getItem(`${viewKey}:scroll`) ?? 0); } catch {}
    if (!Number.isFinite(scroll) || scroll <= 0) return;
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => window.scrollTo({ top: scroll, behavior: 'instant' }));
    });
    return () => { window.cancelAnimationFrame(frame1); window.cancelAnimationFrame(frame2); };
  }, [viewKey]);

  useEffect(() => {
    if (restoredScope !== viewKey) return;
    try { window.sessionStorage.setItem(viewKey, JSON.stringify({ query, pendingOnly })); } catch {}
  }, [viewKey, restoredScope, query, pendingOnly]);

  const rememberDeparture = () => {
    try {
      window.sessionStorage.setItem(viewKey, JSON.stringify({ query, pendingOnly }));
      window.sessionStorage.setItem(`${viewKey}:scroll`, String(window.scrollY));
    } catch {}
  };
  const openActivity = (destination: string) => {
    rememberDeparture();
    router.push(destination);
  };
  const clearFilters = () => {
    setQuery('');
    setPendingOnly(false);
  };
  const selectedPatient = patientFilter ? activityIndex.patientById.get(patientFilter) : undefined;

  const reports = useMemo(() => summary.sessions.filter((session) => {
    const patient = activityIndex.patientById.get(session.patientId);
    const plan = activityIndex.planById.get(session.planId);
    const text = `${patient?.name ?? ''} ${patient?.diagnosis ?? ''} ${plan?.title ?? ''}`.toLowerCase();
    return (!pendingOnly || !session.reviewedAt) && text.includes(normalizedQuery);
  }), [summary.sessions, activityIndex, pendingOnly, normalizedQuery]);

  const timeline = useMemo(() => filterActivityTimeline(state.events, activityIndex, patientFilter, normalizedQuery), [state.events, activityIndex, patientFilter, normalizedQuery]);

  const changeView = (next: View) => {
    setView(next);
    const patient = patientFilter ? `&patientId=${encodeURIComponent(patientFilter)}` : '';
    router.replace(`/activity?view=${next}${patient}`, { scroll: false });
  };

  return <AtalShell><main className="atal-content atal-list-page atal-activity-page">
    <div className="atal-page-heading"><div><span className="atal-eyebrow">Centro clínico</span><h1>Actividad</h1></div></div>
    <div className="atal-view-switch" role="group" aria-label="Vista de actividad"><button type="button" aria-pressed={view === 'tracking'} className={view === 'tracking' ? 'is-active' : ''} onClick={() => changeView('tracking')}><Activity aria-hidden="true" />Seguimiento</button><button type="button" aria-pressed={view === 'reports'} className={view === 'reports' ? 'is-active' : ''} onClick={() => changeView('reports')}><FileText aria-hidden="true" />Reportes</button></div>
    <div className="atal-premium-search"><Search aria-hidden="true" /><input aria-label="Buscar actividad clínica" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'tracking' ? 'Buscar evento, paciente o plan' : 'Buscar paciente o plan'} />{view === 'reports' && <button type="button" className={pendingOnly ? 'is-active' : ''} aria-label="Mostrar solo pendientes" aria-pressed={pendingOnly} onClick={() => setPendingOnly((value) => !value)}><Filter aria-hidden="true" /></button>}</div>
    {patientFilter && <div className="atal-activity-scope" role="group" aria-label="Paciente seleccionado">
      <span>Actividad de <strong>{selectedPatient?.name ?? 'Paciente no disponible'}</strong></span>
      {selectedPatient && <button type="button" onClick={() => openActivity(`/patients/${selectedPatient.id}`)}>Ver expediente <ChevronRight aria-hidden="true" /></button>}
      <button type="button" onClick={() => { clearFilters(); router.push(`/activity?view=${view}`); }}>Quitar filtro de paciente</button>
    </div>}
    <section className="atal-activity-summary"><article><span><TrendingUp /></span><div><small>Adherencia registrada</small><strong>{summary.adherence === null ? '—' : `${summary.adherence}%`}</strong><em>{summary.total ? `${summary.total} sesiones` : 'Sin sesiones'}</em></div></article><article><span className="is-warm"><ClipboardCheck /></span><div><small>Por revisar</small><strong>{summary.pending}</strong><em>{summary.attention ? `${summary.attention} requieren atención` : 'Sin alertas clínicas'}</em></div></article></section>
    <div className="atal-list-meta"><b>{view === 'tracking' ? 'Historial clínico' : 'Reportes de sesión'}</b><span aria-live="polite">{view === 'tracking' ? timeline.length : reports.length} resultados</span></div>
    <div className="atal-activity-feed">
      {view === 'tracking' ? timeline.map((event) => {
        const patient = event.patientId ? activityIndex.patientById.get(event.patientId) : undefined;
        const plan = event.planId ? activityIndex.planById.get(event.planId) : undefined;
        return <button type="button" key={event.id} onClick={() => openActivity(eventDestination(event))}><Avatar name={patient?.name ?? 'Atal'} /><span><b>{event.title}</b><small>{patient?.name ?? 'Actividad general'}{plan ? ` · ${plan.title}` : ''}</small><em>{event.detail}{event.origin === 'atal-ai' ? ' · Atal IA' : ''}</em></span><time><CalendarDays />{new Date(event.createdAt).toLocaleDateString('es-MX')}</time><i /><ChevronRight /></button>;
      }) : reports.map((session) => {
        const patient = activityIndex.patientById.get(session.patientId);
        const plan = activityIndex.planById.get(session.planId);
        const attention = sessionNeedsAttention(session);
        return <button type="button" key={session.id} onClick={() => openActivity(`/activity/${session.id}`)}><Avatar name={patient?.name ?? 'Paciente'} /><span><b>{patient?.name ?? 'Paciente no disponible'}</b><small>{plan?.title ?? 'Plan histórico'} · {session.status === 'completed' ? 'Completada' : 'Parcial'}</small><em>Dolor {session.startPain}/10 → {session.endPain}/10 · {session.reviewedAt ? 'Revisado' : 'Pendiente'}</em></span><time><CalendarDays />{new Date(session.completedAt).toLocaleDateString('es-MX')}</time><i className={attention ? 'is-attention' : ''} /><ChevronRight /></button>;
      })}
    </div>
    {view === 'tracking' && !timeline.length && <div className="atal-empty atal-activity-empty" role="status"><Activity aria-hidden="true" /><strong>Sin actividad coincidente</strong><p>{query.trim() ? 'No encontramos eventos para esta búsqueda.' : 'La actividad aparecerá al crear pacientes, gestionar planes o completar sesiones.'}</p>{query.trim() && <button type="button" onClick={clearFilters}>Limpiar búsqueda</button>}</div>}
    {view === 'reports' && !reports.length && <div className="atal-empty atal-activity-empty" role="status"><FileText aria-hidden="true" /><strong>Sin reportes coincidentes</strong><p>{query.trim() || pendingOnly ? 'Prueba otra búsqueda o muestra todos los reportes.' : 'Completa una sesión guiada para generar un reporte.'}</p>{(query.trim() || pendingOnly) && <button type="button" onClick={clearFilters}>Limpiar filtros</button>}</div>}
  </main></AtalShell>;
}
