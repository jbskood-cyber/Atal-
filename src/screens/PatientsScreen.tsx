'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { AvatarOrInitials, ClinicalListRow, EmptyState, GroupedList, MobileAppHeader, NativeSearchField, SegmentedTabs, StatusBadge } from '@/src/components/native/NativeClinical';
import { usePatientCatalog, type PatientStatus } from '@/src/data/localPatients';
import { useAtalStore } from '@/src/data/atalStore';

type Filter = 'all' | PatientStatus;

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

  return <AtalShell onNew={() => router.push('/patients/new')}><main className="atal-content native-patients">
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
        const plan = state.plans.find((item) => item.patientId === patient.id && item.status === 'active') ?? state.plans.find((item) => item.patientId === patient.id);
        const latest = state.sessions.filter((item) => item.patientId === patient.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
        const tone = latest?.endPain >= 7 ? 'urgent' : patient.status === 'attention' || (latest && !latest.reviewedAt) ? 'attention' : 'stable';
        return <ClinicalListRow key={patient.id} leading={<AvatarOrInitials id={patient.id} name={patient.name} />} title={patient.name} subtitle={patient.diagnosis || patient.affectedArea || 'Motivo clínico por completar'} meta={latest ? `Última sesión ${new Date(latest.completedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : plan ? `${plan.title} · sin sesiones` : 'Sin plan asignado'} tone={tone} onClick={() => router.push(`/patients/${patient.id}`)} trailing={<><StatusBadge tone={plan?.status === 'active' ? 'stable' : plan?.status === 'paused' ? 'attention' : 'neutral'}>{plan?.status === 'active' ? 'Plan activo' : plan?.status === 'paused' ? 'Pausado' : plan ? 'Borrador' : 'Sin plan'}</StatusBadge></>} />;
      })}
      {!visible.length && <EmptyState title="No encontramos pacientes" detail="Ajusta la búsqueda o crea un paciente nuevo." action="Nuevo paciente" onAction={() => router.push('/patients/new')} />}
    </GroupedList>
  </main></AtalShell>;
}
