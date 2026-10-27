'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Eye, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { ClinicalQuickPeek } from '@/src/components/atal/ClinicalQuickPeek';
import { useDirectoryView } from '@/src/hooks/useDirectoryView';
import { statusColor, usePatientCatalog, type PatientStatus } from '@/src/data/localPatients';

type Filter = 'all' | PatientStatus;
type PatientDirectoryView = { query: string; filter: Filter; ascending: boolean };
const DEFAULT_VIEW: PatientDirectoryView = { query: '', filter: 'active', ascending: true };

function isPatientDirectoryView(value: unknown): value is PatientDirectoryView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PatientDirectoryView>;
  return typeof candidate.query === 'string'
    && candidate.query.length <= 200
    && ['all', 'active', 'attention', 'archived'].includes(candidate.filter ?? '')
    && typeof candidate.ascending === 'boolean';
}

export function PatientsScreen() {
  const router = useRouter();
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekTrigger = useRef<HTMLButtonElement | null>(null);
  const closePeek = () => { setPeekId(null); window.requestAnimationFrame(() => peekTrigger.current?.focus()); };
  const { view, setView, rememberDeparture } = useDirectoryView('patients', DEFAULT_VIEW, isPatientDirectoryView);
  const patientCatalog = usePatientCatalog();
  const { query, filter, ascending } = view;

  const visible = useMemo(() => patientCatalog.filter((patient) => {
    const matchesFilter = filter === 'all' || patient.status === filter;
    const text = `${patient.name} ${patient.diagnosis}`.toLocaleLowerCase('es-MX');
    return matchesFilter && text.includes(query.trim().toLocaleLowerCase('es-MX'));
  }).sort((a, b) => ascending ? a.name.localeCompare(b.name, 'es-MX') : b.name.localeCompare(a.name, 'es-MX')), [patientCatalog, query, filter, ascending]);

  const openPatient = (id: string) => {
    rememberDeparture();
    router.push(`/patients/${id}`);
  };
  const resetFilters = () => setView((current) => ({ ...current, query: '', filter: 'all' }));
  const filters: { value: Filter; label: string; dot?: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos', dot: statusColor.active },
    { value: 'attention', label: 'Atención', dot: statusColor.attention },
    { value: 'archived', label: 'Archivados', dot: statusColor.archived },
  ];

  return (
    <AtalShell onNew={() => router.push('/patients/new')}>
      <main className="atal-content atal-list-page atal-patient-directory">
        <div className="atal-page-heading"><h1>Pacientes</h1><button type="button" onClick={() => router.push('/patients/new')}><Plus size={19} /> Nuevo paciente</button></div>
        <SearchBar value={query} onChange={(next) => setView((current) => ({ ...current, query: next }))} placeholder="Buscar paciente" />
        <div className="atal-segments atal-patient-filters" role="group" aria-label="Filtrar pacientes por estado">
          {filters.map(({ value, label, dot }) => (
            <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value}
              onClick={() => setView((current) => ({ ...current, filter: value }))}>
              {dot && <i aria-hidden="true" style={{ background: dot }} />}{label}
            </button>
          ))}
        </div>
        <div className="atal-list-meta">
          <span aria-live="polite">{visible.length} pacientes</span>
          <button type="button" onClick={() => setView((current) => ({ ...current, ascending: !current.ascending }))}>
            Nombre {ascending ? 'A–Z' : 'Z–A'} <ChevronDown size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="atal-dense-list">
          {visible.map((patient) => (
            <div key={patient.id} className="atal-peek-row">
              <button type="button" className="atal-dense-row" onClick={() => openPatient(patient.id)}>
                <Avatar name={patient.name} />
                <span><b>{patient.name}</b><small>{patient.diagnosis}</small><small>{patient.progress}% del plan completado</small></span>
                <i aria-hidden="true" style={{ background: statusColor[patient.status] }} />
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button type="button" className="atal-peek-trigger" aria-label={`Vista rápida de ${patient.name}`}
                onClick={(event) => { peekTrigger.current = event.currentTarget; setPeekId(patient.id); }}>
                <Eye aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {!visible.length && (
          <div className="atal-empty atal-directory-empty" role="status">
            <strong>{patientCatalog.length ? 'No hay pacientes con estos filtros' : 'Todavía no hay pacientes'}</strong>
            <p>{patientCatalog.length ? 'Prueba otra búsqueda o consulta todos los estados.' : 'Agrega un paciente para comenzar el seguimiento.'}</p>
            {patientCatalog.length
              ? <button type="button" onClick={resetFilters}>Limpiar filtros</button>
              : <button type="button" onClick={() => router.push('/patients/new')}>Nuevo paciente</button>}
          </div>
        )}
      </main>
      {peekId && <ClinicalQuickPeek target={{ kind: 'patient', id: peekId }}
        onClose={closePeek} onOpenDetail={() => openPatient(peekId)} />}
    </AtalShell>
  );
}
