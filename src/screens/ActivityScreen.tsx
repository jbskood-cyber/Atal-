'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, FileText, Filter, Search, TrendingUp } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { patients } from '@/src/data/atal-demo';

type View = 'tracking' | 'reports';

export function ActivityScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>(params.get('view') === 'reports' ? 'reports' : 'tracking');
  const [query, setQuery] = useState('');
  const entries = useMemo(() => patients.slice(0, 7).filter((patient) => `${patient.name} ${patient.diagnosis}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const changeView = (next: View) => { setView(next); router.replace(`/activity?view=${next}`, { scroll: false }); };

  return <AtalShell><main className="atal-content atal-list-page atal-activity-page">
    <div className="atal-page-heading"><div><span className="atal-eyebrow">Centro clínico</span><h1>Actividad</h1></div></div>
    <div className="atal-view-switch"><button type="button" className={view === 'tracking' ? 'is-active' : ''} onClick={() => changeView('tracking')}><Activity /> Seguimiento</button><button type="button" className={view === 'reports' ? 'is-active' : ''} onClick={() => changeView('reports')}><FileText /> Reportes</button></div>
    <label className="atal-premium-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente o plan" /><button type="button" aria-label="Filtros"><Filter /></button></label>
    <section className="atal-activity-summary"><article><span><TrendingUp /></span><div><small>Adherencia media</small><strong>84%</strong><em>+6% esta semana</em></div></article><article><span className="is-warm"><ClipboardCheck /></span><div><small>{view === 'tracking' ? 'Por revisar' : 'Reportes nuevos'}</small><strong>{view === 'tracking' ? '4' : '7'}</strong><em>Requieren atención</em></div></article></section>
    <div className="atal-list-meta"><b>{view === 'tracking' ? 'Seguimientos recientes' : 'Reportes recientes'}</b><span>{entries.length} resultados</span></div>
    <div className="atal-activity-feed">{entries.map((patient, index) => <button type="button" key={patient.id} onClick={() => router.push(`/activity/${patient.id}`)}><Avatar name={patient.name} /><span><b>{patient.name}</b><small>{view === 'tracking' ? patient.diagnosis : `${patient.plan} · Sesión ${index + 2}`}</small><em>{view === 'tracking' ? `Dolor ${2 + index % 5}/10　•　Adherencia ${patient.adherence}%` : index % 2 ? 'Comentario del paciente incluido' : 'Sesión enviada correctamente'}</em></span><time><CalendarDays />{index < 2 ? 'Hoy' : 'Ayer'}</time><i className={index % 3 === 1 ? 'is-attention' : ''} /><ChevronRight /></button>)}</div>
  </main></AtalShell>;
}
