'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { AvatarOrInitials, ClinicalListRow, EmptyState, GroupedList, MobileAppHeader, NativeSearchField, SegmentedTabs, StatusBadge } from '@/src/components/native/NativeClinical';
import { usePatientCatalog, type PatientStatus } from '@/src/data/localPatients';
import { useAtalStore } from '@/src/data/atalStore';

type Filter = 'all' | PatientStatus;

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function PatientsScreen() {
  const router = useRouter();
  const patients = usePatientCatalog();
  const state = useAtalStore((store) => ({ plans: store.plans, sessions: store.sessions }));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [ascending, setAscending] = useState(true);
  const visible = useMemo(() => patients.filter((patient) => {
    const matchesFilter = filter === 'all' || patient.status === filter;
    return matchesFilter && `${patient.name} ${patient.diagnosis} ${patient.affectedArea}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
  }).sort((a, b) => ascending ? a.name.localeCompare(b.name, 'es') : b.name.localeCompare(a.name, 'es')), [patients, query, filter, ascending]);

  return <AtalShell onNew={() => router.push('/patients/new')}><main className="atal-content native-patients atal-patients-rescue">
    <MobileAppHeader title="Pacientes" actions={<button type="button" onClick={() => router.push('/patients/new')} aria-label="Nuevo paciente"><Plus /></button>} />
    <NativeSearchField value={query} onChange={setQuery} placeholder="Buscar por nombre, motivo o región" />
    <SegmentedTabs value={filter} label="Estado de pacientes" onChange={setFilter} items={[
      { value: 'active', label: 'Activos', count: patients.filter((patient) => patient.status === 'active').length },
      { value: 'attention', label: 'Atención', count: patients.filter((patient) => patient.status === 'attention').length },
      { value: 'archived', label: 'Archivados', count: patients.filter((patient) => patient.status === 'archived').length },
    ]} />
    <div className="native-patients__meta"><span>{visible.length} {visible.length === 1 ? 'paciente' : 'pacientes'}</span><button type="button" onClick={() => setAscending((value) => !value)}>Nombre {ascending ? 'A–Z' : 'Z–A'} <ChevronDown size={14} /></button></div>
    <GroupedList>
      {visible.map((patient) => {
        const activePlan = state.plans.find((item) => item.patientId === patient.id && item.status === 'active');
        const latest = state.sessions.filter((item) => item.patientId === patient.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
        const pendingReport = Boolean(latest && !latest.reviewedAt);
        const tone = latest?.endPain >= 7 ? 'urgent' : patient.status === 'attention' || pendingReport ? 'attention' : patient.status === 'archived' ? 'neutral' : 'stable';
        const statusLabel = latest?.endPain >= 7 ? 'Dolor alto' : pendingReport ? 'Por revisar' : patient.status === 'attention' ? 'Atención' : patient.status === 'archived' ? 'Archivado' : !activePlan ? 'Sin plan' : '';
        const subtitle = [patient.affectedArea, patient.diagnosis].filter(Boolean).join(' · ') || 'Motivo clínico por completar';
        const meta = latest ? `Última sesión ${shortDate(latest.completedAt)} · Dolor ${latest.endPain}/10` : activePlan ? 'Sin actividad registrada' : 'Sin plan activo';
        return <ClinicalListRow
          key={patient.id}
          leading={<AvatarOrInitials id={patient.id} name={patient.name} />}
          title={patient.name}
          subtitle={subtitle}
          meta={meta}
          tone={tone}
          onClick={() => router.push(`/patients/${patient.id}`)}
          trailing={<span className="atal-patient-row-action">{statusLabel && <StatusBadge tone={tone}>{statusLabel}</StatusBadge>}<ChevronRight /></span>}
        />;
      })}
      {!visible.length && <EmptyState title="No encontramos pacientes" detail="Ajusta la búsqueda o crea un paciente nuevo." action="Nuevo paciente" onAction={() => router.push('/patients/new')} />}
    </GroupedList>
  </main></AtalShell>;
}
