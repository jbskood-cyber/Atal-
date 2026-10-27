'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Eye, Plus, RefreshCw } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { ClinicalQuickPeek } from '@/src/components/atal/ClinicalQuickPeek';
import { useDirectoryView } from '@/src/hooks/useDirectoryView';
import { useLocalPlans, type PlanStatus } from '@/src/data/localPlans';
import { usePatientCatalog } from '@/src/data/localPatients';

type PlansDirectoryView = { query: string; filter: PlanStatus };
const DEFAULT_VIEW: PlansDirectoryView = { query: '', filter: 'active' };
const FILTERS: [PlanStatus, string][] = [
  ['active', 'Activos'],
  ['draft', 'Borradores'],
  ['paused', 'Pausados'],
  ['completed', 'Completados'],
  ['archived', 'Archivados'],
];

function isPlansDirectoryView(value: unknown): value is PlansDirectoryView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlansDirectoryView>;
  return typeof candidate.query === 'string'
    && candidate.query.length <= 200
    && FILTERS.some(([status]) => status === candidate.filter);
}

export function PlansScreen() {
  const router = useRouter();
  const [peekId, setPeekId] = useState<string | null>(null);
  const peekTrigger = useRef<HTMLButtonElement | null>(null);
  const closePeek = () => { setPeekId(null); window.requestAnimationFrame(() => peekTrigger.current?.focus()); };
  const { view, setView, rememberDeparture } = useDirectoryView('plans', DEFAULT_VIEW, isPlansDirectoryView);
  const { query, filter } = view;
  const plans = useLocalPlans();
  const patients = usePatientCatalog();
  const planCatalog = useMemo(() => plans.map((plan) => ({
    ...plan,
    patient: patients.find((item) => item.id === plan.patientId)?.name ?? 'Paciente no disponible',
    updated: `Actualizado ${new Date(plan.updatedAt).toLocaleDateString('es-MX')}`,
  })), [plans, patients]);
  const visible = useMemo(() => planCatalog.filter((plan) =>
    plan.status === filter && `${plan.title} ${plan.patient}`.toLocaleLowerCase('es-MX').includes(query.trim().toLocaleLowerCase('es-MX'))
  ), [planCatalog, query, filter]);

  const openPlan = (id: string) => {
    rememberDeparture();
    router.push(`/plans/${id}`);
  };

  return (
    <AtalShell onNew={() => router.push('/plans/new')}>
      <main className="atal-content atal-list-page atal-plan-directory">
        <div className="atal-page-heading"><h1>Planes</h1><button type="button" onClick={() => router.push('/plans/new')}><Plus size={19} /> Nuevo plan</button></div>
        <SearchBar value={query} onChange={(next) => setView((current) => ({ ...current, query: next }))} placeholder="Buscar planes" />
        <div className="atal-segments atal-plan-segments" role="group" aria-label="Filtrar planes por estado">
          {FILTERS.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'is-active' : ''}
              onClick={() => setView((current) => ({ ...current, filter: value }))}>
              {label} <b>{planCatalog.filter((plan) => plan.status === value).length}</b>
            </button>
          ))}
        </div>
        <div className="atal-dense-list atal-plan-list">
          {visible.map((plan) => (
            <div key={plan.id} className="atal-peek-row">
              <button type="button" className="atal-plan-row" onClick={() => openPlan(plan.id)}>
                <Avatar name={plan.patient} />
                <span><b>{plan.title}</b><small>{plan.patient}</small><small><CalendarDays size={15} aria-hidden="true" /> {plan.duration}　　<RefreshCw size={15} aria-hidden="true" /> {plan.frequency}</small><em>{plan.updated}</em></span>
                <ChevronRight size={21} aria-hidden="true" />
              </button>
              <button type="button" className="atal-peek-trigger" aria-label={`Vista rápida de ${plan.title}`}
                onClick={(event) => { peekTrigger.current = event.currentTarget; setPeekId(plan.id); }}>
                <Eye aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {!visible.length && (
          <div className="atal-empty atal-directory-empty" role="status">
            <strong>{plans.length ? 'No hay planes con estos filtros' : 'Todavía no hay planes'}</strong>
            <p>{plans.length ? 'Prueba otra búsqueda o cambia el estado del plan.' : 'Crea un plan para comenzar el tratamiento.'}</p>
            {plans.length
              ? <button type="button" onClick={() => setView(DEFAULT_VIEW)}>Limpiar filtros</button>
              : <button type="button" onClick={() => router.push('/plans/new')}>Nuevo plan</button>}
          </div>
        )}
      </main>
      {peekId && <ClinicalQuickPeek target={{ kind: 'plan', id: peekId }}
        onClose={closePeek} onOpenDetail={() => openPlan(peekId)} />}
    </AtalShell>
  );
}
