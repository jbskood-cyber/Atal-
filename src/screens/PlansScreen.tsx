'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { plans, type Plan } from '@/src/data/atal-demo';
import { readLocalPlans } from '@/src/data/localPlans';
import { getPatientById } from '@/src/data/localPatients';

export function PlansScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Plan['status']>('active');
  const router = useRouter();
  const [planCatalog] = useState(() => [...readLocalPlans().map((plan) => ({ id: plan.id, title: plan.title, patient: getPatientById(plan.patientId)?.name ?? 'Paciente local', duration: plan.duration, frequency: plan.frequency, updated: `Actualizado ${new Date(plan.updatedAt).toLocaleDateString('es-MX')}`, status: plan.status, phase: plan.status === 'draft' ? 'Borrador' : 'Plan local' } as Plan)), ...plans]);
  const visible = useMemo(() => planCatalog.filter((plan) => plan.status === filter && `${plan.title} ${plan.patient}`.toLowerCase().includes(query.toLowerCase())), [planCatalog, query, filter]);

  return (
    <AtalShell onNew={() => router.push('/plans/new')}>
      <main className="atal-content atal-list-page">
        <div className="atal-page-heading"><h1>Planes</h1><button type="button" onClick={() => router.push('/plans/new')}><Plus size={19} /> Nuevo plan</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planes" />
        <div className="atal-segments atal-plan-segments">
          <button type="button" className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>Activos <b>{planCatalog.filter((plan) => plan.status === 'active').length}</b></button>
          <button type="button" className={filter === 'draft' ? 'is-active' : ''} onClick={() => setFilter('draft')}>Borradores <b>{planCatalog.filter((plan) => plan.status === 'draft').length}</b></button>
          <button type="button" className={filter === 'archived' ? 'is-active' : ''} onClick={() => setFilter('archived')}>Archivados <b>{planCatalog.filter((plan) => plan.status === 'archived').length}</b></button>
        </div>
        <div className="atal-dense-list atal-plan-list">
          {visible.map((plan) => (
            <button key={plan.id} type="button" className="atal-plan-row" onClick={() => router.push(`/plans/${plan.id}`)}>
              <Avatar name={plan.patient} />
              <span><b>{plan.title}</b><small>{plan.patient}</small><small><CalendarDays size={15} /> {plan.duration}　　<RefreshCw size={15} /> {plan.frequency}</small><em>{plan.updated}</em></span>
              <ChevronRight size={21} />
            </button>
          ))}
        </div>
      </main>
    </AtalShell>
  );
}
