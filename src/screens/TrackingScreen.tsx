'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { trackingEntries, type TrackingEntry } from '@/src/data/atal-demo';

type TrackingFilter = 'all' | TrackingEntry['status'];

export function TrackingScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TrackingFilter>('all');
  const visible = useMemo(() => trackingEntries.filter((entry) => (filter === 'all' || entry.status === filter) && `${entry.patient} ${entry.diagnosis}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <AtalShell><main className="atal-content atal-list-page atal-tracking-page">
    <div className="atal-page-heading"><h1>Seguimiento</h1></div>
    <div className="atal-search-with-filter"><SearchBar value={query} onChange={setQuery} placeholder="Buscar paciente o plan" /><button type="button" aria-label="Filtros"><Filter /></button></div>
    <div className="atal-status-scroll"><FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Todo" count={trackingEntries.length} /><FilterChip active={filter === 'attention'} onClick={() => setFilter('attention')} label="Atención" /><FilterChip active={filter === 'new'} onClick={() => setFilter('new')} label="Revisar" /><FilterChip active={filter === 'reviewed'} onClick={() => setFilter('reviewed')} label="Completos" /></div>
    <div className="atal-list-meta"><b>Recientes</b><button type="button">Más recientes <ChevronDown /></button></div>
    <div className="atal-tracking-list">{visible.map((entry) => <button type="button" key={entry.id} onClick={() => router.push(`/reports/${entry.id}`)}><Avatar name={entry.patient} /><span><b>{entry.patient}</b><small>{entry.diagnosis}</small><em>Dolor <strong>{entry.pain}/10</strong>　•　Fatiga <strong>{entry.fatigue}/10</strong>　•　Adherencia <strong>{entry.adherence}%</strong></em></span><time>{entry.time}</time><i className={`is-${entry.status}`} /><ChevronRight /></button>)}</div>
    {!visible.length && <div className="atal-empty">No hay seguimientos con estos filtros.</div>}
  </main></AtalShell>;
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) { return <button type="button" className={active ? 'is-active' : ''} onClick={onClick}><i />{label}{count !== undefined && <b>{count}</b>}</button>; }
