'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { plans, type Plan } from '@/src/data/atal-demo';

export function PlansScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Plan['status']>('active');
  const router = useRouter();
  const visible = useMemo(() => plans.filter((plan) => plan.status === filter && `${plan.title} ${plan.patient}`.toLowerCase().includes(query.toLowerCase())), [plans, query, filter]);

  return (
    <AtalShell onNew={() => router.push('/plans/new')}>
      <main className="atal-content atal-list-page">
        <div className="atal-page-heading"><h1>Planes</h1><button type="button" onClick={() => router.push('/plans/new')}><Plus size={19} /> Nuevo plan</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planes" />
        <div className="atal-segments atal-plan-segments">
          <button type="button" className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>Activos <b>{plans.filter((plan) => plan.status === 'active').length}</b></button>
          <button type="button" className={filter === 'draft' ? 'is-active' : ''} onClick={() => setFilter('draft')}>Borradores <b>{plans.filter((plan) => plan.status === 'draft').length}</b></button>
          <button type="button" className={filter === 'archived' ? 'is-active' : ''} onClick={() => setFilter('archived')}>Archivados <b>{plans.filter((plan) => plan.status === 'archived').length}</b></button>
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
