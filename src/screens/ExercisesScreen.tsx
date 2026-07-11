'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { QuickCreateModal } from '@/src/components/atal/QuickCreateModal';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { exercises as initialExercises } from '@/src/data/atal-demo';

const regions = ['Todos', 'Rodilla', 'Hombro', 'Cadera', 'Columna', 'Tobillo'];

export function ExercisesScreen() {
  const [exercises, setExercises] = useState(initialExercises);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Todos');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visible = useMemo(() => exercises.filter((exercise) => (region === 'Todos' || exercise.region === region) && `${exercise.name} ${exercise.category}`.toLowerCase().includes(query.toLowerCase())), [exercises, region, query]);

  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return (
    <AtalShell onNew={() => setCreateOpen(true)}>
      <main className="atal-content atal-list-page atal-exercises-page">
        <div className="atal-page-heading"><h1>Ejercicios</h1><button type="button" onClick={() => setCreateOpen(true)}><Plus size={19} /> Nuevo ejercicio</button></div>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar ejercicio" />
        <div className="atal-filter-scroll">{regions.map((value) => <button type="button" key={value} className={region === value ? 'is-active' : ''} onClick={() => setRegion(value)}>{value === 'Todos' && <i />}{value}</button>)}</div>
        <div className="atal-list-meta"><span>{visible.length} ejercicios</span><button type="button">Ordenar: Nombre <ChevronDown size={17} /></button></div>
        <div className="atal-exercise-list">
          {visible.map((exercise) => (
            <button type="button" key={exercise.id} className={selectedIds.includes(exercise.id) ? 'is-selected' : ''} onClick={() => toggle(exercise.id)}>
              <img src={exercise.image} alt="" />
              <span><b>{exercise.name}</b><small>{exercise.region}　•　{exercise.category}</small></span>
              <Plus size={22} />
            </button>
          ))}
        </div>
        {selectedIds.length > 0 && <div className="atal-selection-bar"><span>{selectedIds.length} seleccionados</span><button type="button" onClick={() => setSelectedIds([])}>Limpiar</button></div>}
      </main>
      {createOpen && <QuickCreateModal title="Nuevo ejercicio" label="Nombre del ejercicio" placeholder="Ejercicio demostrativo" onClose={() => setCreateOpen(false)} onCreate={(name) => setExercises((current) => [{ id: `e${current.length + 1}`, name, region: 'Rodilla', category: 'Fuerza', image: current[0].image }, ...current])} />}
    </AtalShell>
  );
}
