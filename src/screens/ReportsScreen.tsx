'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Filter } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { trackingEntries, type TrackingEntry } from '@/src/data/atal-demo';

type ReportFilter = 'all' | TrackingEntry['status'];

export function ReportsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('all');
  const visible = useMemo(() => trackingEntries.filter((entry) => (filter === 'all' || entry.status === filter) && `${entry.patient} ${entry.plan}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  return <AtalShell><main className="atal-content atal-list-page atal-reports-page">
    <div className="atal-page-heading"><h1>Reportes</h1></div>
    <div className="atal-search-with-filter"><SearchBar value={query} onChange={setQuery} placeholder="Buscar reportes" /><button type="button"><Filter /></button></div>
    <div className="atal-status-scroll"><ReportChip active={filter === 'all'} onClick={() => setFilter('all')} label="Todos" count={trackingEntries.length} /><ReportChip active={filter === 'new'} onClick={() => setFilter('new')} label="Nuevos" count={3} /><ReportChip active={filter === 'attention'} onClick={() => setFilter('attention')} label="Pendientes" count={2} /><ReportChip active={filter === 'reviewed'} onClick={() => setFilter('reviewed')} label="Revisados" count={1} /></div>
    <div className="atal-report-list">{visible.map((entry, index) => <button type="button" key={entry.id} onClick={() => router.push(`/reports/${entry.id}`)}><Avatar name={entry.patient} /><span><b>{entry.patient}</b><small>{entry.plan}</small><em>{entry.status === 'attention' ? 'Comentario del paciente incluido' : `Sesión ${index + 2} enviada`}</em><time><CalendarDays /> {entry.time}</time></span><i className={`is-${entry.status}`} /><ChevronRight /></button>)}</div>
  </main></AtalShell>;
}

function ReportChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) { return <button type="button" className={active ? 'is-active' : ''} onClick={onClick}><i />{label}<b>{count}</b></button>; }
