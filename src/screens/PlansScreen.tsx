'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { QuickCreateModal } from '@/src/components/atal/QuickCreateModal';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { plans as initialPlans, type Plan } from '@/src/data/atal-demo';

export function PlansScreen() {
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Plan['status']>('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Plan | null>(null);
  const visible = useMemo(() => plans.filter((plan) => plan.status === filter && `${plan.title} ${plan.patient}`.toLowerCase().includes(query.toLowerCase())), [plans, query, filter]);

  return (
    <AtalShell onNew={() => setCreateOpen(true)}>
      <main className="atal-content atal-list-page">
        <div className="atal-page-heading"><h1>Planes</h1><button type="button" onClick={() => setCreateOpen(true)}><Plus size={19} /> Nuevo plan</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planes" />
        <div className="atal-segments atal-plan-segments">
          <button type="button" className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>Activos <b>{plans.filter((plan) => plan.status === 'active').length}</b></button>
          <button type="button" className={filter === 'draft' ? 'is-active' : ''} onClick={() => setFilter('draft')}>Borradores <b>{plans.filter((plan) => plan.status === 'draft').length}</b></button>
          <button type="button" className={filter === 'archived' ? 'is-active' : ''} onClick={() => setFilter('archived')}>Archivados <b>{plans.filter((plan) => plan.status === 'archived').length}</b></button>
        </div>
        <div className="atal-dense-list atal-plan-list">
          {visible.map((plan) => (
            <button key={plan.id} type="button" className="atal-plan-row" onClick={() => setSelected(plan)}>
              <Avatar name={plan.patient} />
              <span><b>{plan.title}</b><small>{plan.patient}</small><small><CalendarDays size={15} /> {plan.duration}　　<RefreshCw size={15} /> {plan.frequency}</small><em>{plan.updated}</em></span>
              <ChevronRight size={21} />
            </button>
          ))}
        </div>
      </main>
      {createOpen && <QuickCreateModal title="Nuevo plan" label="Nombre del plan" placeholder="Plan funcional — Fase 1" onClose={() => setCreateOpen(false)} onCreate={(title) => setPlans((current) => [{ id: `pl${current.length + 1}`, title, patient: 'Paciente Demo 01', duration: '4 semanas', frequency: '3x por semana', updated: 'Creado ahora', status: 'draft', phase: 'Borrador' }, ...current])} />}
      {selected && <PlanDetail plan={selected} onClose={() => setSelected(null)} />}
    </AtalShell>
  );
}

function PlanDetail({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  return <div className="atal-modal-layer" onMouseDown={onClose}><div className="atal-detail-sheet" role="dialog" aria-label={plan.title} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="atal-detail-sheet__close" onClick={onClose}>Cerrar</button><ClipboardHero /><h2>{plan.title}</h2><p>{plan.patient}</p><div className="atal-detail-metrics"><span><strong>{plan.duration}</strong><small>Duración</small></span><span><strong>{plan.frequency}</strong><small>Frecuencia</small></span><span><strong>{plan.phase}</strong><small>Estado</small></span></div></div></div>;
}

function ClipboardHero() { return <span className="atal-detail-hero"><CalendarDays size={28} /></span>; }
