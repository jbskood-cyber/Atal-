'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { patients, statusColor, type PatientStatus } from '@/src/data/atal-demo';

type Filter = 'all' | PatientStatus;

export function PatientsScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const router = useRouter();

  const visible = useMemo(() => patients.filter((patient) => {
    const matchesFilter = filter === 'all' || patient.status === filter;
    const text = `${patient.name} ${patient.diagnosis}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase());
  }), [patients, query, filter]);

  return (
    <AtalShell onNew={() => router.push('/patients/new')}>
      <main className="atal-content atal-list-page atal-patient-directory">
        <div className="atal-page-heading"><h1>Pacientes</h1><button type="button" onClick={() => router.push('/patients/new')}><Plus size={19} /> Nuevo paciente</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar paciente" />
        <div className="atal-segments">
          <Segment active={filter === 'active'} onClick={() => setFilter('active')} dot={statusColor.active}>Activos</Segment>
          <Segment active={filter === 'attention'} onClick={() => setFilter('attention')} dot={statusColor.attention}>Atención</Segment>
          <Segment active={filter === 'archived'} onClick={() => setFilter('archived')} dot={statusColor.archived}>Archivados</Segment>
        </div>
        <div className="atal-list-meta"><span>{visible.length} pacientes</span><button type="button">Ordenar: Nombre <ChevronDown size={17} /></button></div>
        <div className="atal-dense-list">
          {visible.map((patient) => (
            <button key={patient.id} type="button" className="atal-dense-row" onClick={() => router.push(`/patients/${patient.id}`)}>
              <Avatar name={patient.name} />
              <span><b>{patient.name}</b><small>{patient.diagnosis}</small><small>{patient.progress}% del plan completado</small></span>
              <i style={{ background: statusColor[patient.status] }} />
              <ChevronRight size={20} />
            </button>
          ))}
        </div>
        {!visible.length && <div className="atal-empty">No encontramos pacientes con estos filtros.</div>}
      </main>
    </AtalShell>
  );
}

function Segment({ children, active, onClick, dot }: { children: React.ReactNode; active: boolean; onClick: () => void; dot: string }) {
  return <button type="button" className={active ? 'is-active' : ''} onClick={onClick}><i style={{ background: dot }} />{children}</button>;
}
