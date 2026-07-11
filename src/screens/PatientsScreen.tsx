'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { QuickCreateModal } from '@/src/components/atal/QuickCreateModal';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { patients as initialPatients, statusColor, type Patient, type PatientStatus } from '@/src/data/atal-demo';

type Filter = 'all' | PatientStatus;

export function PatientsScreen() {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const visible = useMemo(() => patients.filter((patient) => {
    const matchesFilter = filter === 'all' || patient.status === filter;
    const text = `${patient.name} ${patient.diagnosis}`.toLowerCase();
    return matchesFilter && text.includes(query.toLowerCase());
  }), [patients, query, filter]);

  const addPatient = (name: string) => {
    setPatients((current) => [{ id: `p${current.length + 1}`, name, diagnosis: 'Caso demostrativo nuevo', plan: 'Sin plan', progress: 0, time: 'Ahora', status: 'active', adherence: 0 }, ...current]);
  };

  return (
    <AtalShell onNew={() => setCreateOpen(true)}>
      <main className="atal-content atal-list-page">
        <div className="atal-page-heading"><h1>Pacientes</h1><button type="button" onClick={() => setCreateOpen(true)}><Plus size={19} /> Nuevo paciente</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar paciente" />
        <div className="atal-segments">
          <Segment active={filter === 'active'} onClick={() => setFilter('active')} dot={statusColor.active}>Activos</Segment>
          <Segment active={filter === 'attention'} onClick={() => setFilter('attention')} dot={statusColor.attention}>Atención</Segment>
          <Segment active={filter === 'archived'} onClick={() => setFilter('archived')} dot={statusColor.archived}>Archivados</Segment>
        </div>
        <div className="atal-list-meta"><span>{visible.length} pacientes</span><button type="button">Ordenar: Nombre <ChevronDown size={17} /></button></div>
        <div className="atal-dense-list">
          {visible.map((patient) => (
            <button key={patient.id} type="button" className="atal-dense-row" onClick={() => setSelected(patient)}>
              <Avatar name={patient.name} />
              <span><b>{patient.name}</b><small>{patient.diagnosis}</small><small>{patient.plan}　•　{patient.progress}% completado</small></span>
              <i style={{ background: statusColor[patient.status] }} />
              <em>{patient.time}</em>
              <ChevronRight size={20} />
            </button>
          ))}
        </div>
        {!visible.length && <div className="atal-empty">No encontramos pacientes con estos filtros.</div>}
      </main>
      {createOpen && <QuickCreateModal title="Nuevo paciente" label="Nombre" placeholder="Paciente Demo 13" onClose={() => setCreateOpen(false)} onCreate={addPatient} />}
      {selected && <PatientDetail patient={selected} onClose={() => setSelected(null)} />}
    </AtalShell>
  );
}

function Segment({ children, active, onClick, dot }: { children: React.ReactNode; active: boolean; onClick: () => void; dot: string }) {
  return <button type="button" className={active ? 'is-active' : ''} onClick={onClick}><i style={{ background: dot }} />{children}</button>;
}

function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  return (
    <div className="atal-modal-layer" onMouseDown={onClose}>
      <div className="atal-detail-sheet" role="dialog" aria-label={`Expediente de ${patient.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="atal-detail-sheet__close" onClick={onClose}>Cerrar</button>
        <Avatar name={patient.name} size="lg" />
        <h2>{patient.name}</h2><p>{patient.diagnosis}</p>
        <div className="atal-detail-metrics"><span><strong>{patient.progress}%</strong><small>Progreso</small></span><span><strong>{patient.adherence}%</strong><small>Adherencia</small></span><span><strong>{patient.plan}</strong><small>Plan actual</small></span></div>
      </div>
    </div>
  );
}
