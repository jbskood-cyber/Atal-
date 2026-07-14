'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { useLocalPlans, type PlanStatus } from '@/src/data/localPlans';
import { usePatientCatalog } from '@/src/data/localPatients';

export function PlansScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PlanStatus>('active');
  const router = useRouter();
  const plans = useLocalPlans();
  const patients = usePatientCatalog();
  const planCatalog = useMemo(() => plans.map((plan) => ({...plan,patient:patients.find((item)=>item.id===plan.patientId)?.name??'Paciente no disponible',updated:`Actualizado ${new Date(plan.updatedAt).toLocaleDateString('es-MX')}`})),[plans,patients]);
  const visible = useMemo(() => planCatalog.filter((plan) => plan.status === filter && `${plan.title} ${plan.patient}`.toLowerCase().includes(query.toLowerCase())), [planCatalog, query, filter]);
  const filters:[PlanStatus,string][]=[['active','Activos'],['draft','Borradores'],['paused','Pausados'],['completed','Completados'],['archived','Archivados']];

  return (
    <AtalShell onNew={() => router.push('/plans/new')}>
      <main className="atal-content atal-list-page">
        <div className="atal-page-heading"><h1>Planes</h1><button type="button" onClick={() => router.push('/plans/new')}><Plus size={19} /> Nuevo plan</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planes" />
        <div className="atal-segments atal-plan-segments">
          {filters.map(([value,label])=><button type="button" key={value} className={filter===value?'is-active':''} onClick={()=>setFilter(value)}>{label} <b>{planCatalog.filter((plan)=>plan.status===value).length}</b></button>)}
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
        {!visible.length&&<div className="atal-empty">No hay planes en este estado.</div>}
      </main>
    </AtalShell>
  );
}
