'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { SearchBar } from '@/src/components/atal/SearchBar';
import { getExerciseCatalog } from '@/src/data/localExercises';

const regions = ['Todos', 'Rodilla', 'Hombro', 'Cadera', 'Columna', 'Tobillo'];

export function ExercisesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Todos');
  const [selected, setSelected] = useState<string[]>([]);
  const [allExercises] = useState(getExerciseCatalog);
  const visible = useMemo(() => allExercises.filter((exercise) => (region === 'Todos' || exercise.region === region) && `${exercise.name} ${exercise.category}`.toLowerCase().includes(query.toLowerCase())), [allExercises, query, region]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <AtalShell onNew={() => router.push('/exercises/new')}><main className="atal-content atal-list-page atal-exercises-page">
    <div className="atal-page-heading atal-exercises-heading"><h1>Ejercicios</h1><button type="button" aria-label="Crear nuevo ejercicio" onClick={() => router.push('/exercises/new')}><Plus /> Nuevo ejercicio</button></div>
    <SearchBar value={query} onChange={setQuery} placeholder="Buscar ejercicio" />
    <div className="atal-filter-scroll">{regions.map((item) => <button type="button" key={item} className={region === item ? 'is-active' : ''} onClick={() => setRegion(item)}>{item}</button>)}</div>
    <div className="atal-list-meta"><span>{visible.length} ejercicios</span><button type="button">Ordenar: Nombre <ChevronDown /></button></div>
    <div className="atal-exercise-list">{visible.map((exercise) => <div key={exercise.id} className={selected.includes(exercise.id) ? 'is-selected' : ''}><button type="button" onClick={() => router.push(`/exercises/${exercise.id}`)}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>{exercise.region} · {exercise.category}</small></span><ChevronRight /></button><button type="button" aria-label={`${selected.includes(exercise.id) ? 'Quitar' : 'Añadir'} ${exercise.name}`} className="atal-exercise-select" onClick={() => toggle(exercise.id)}>{selected.includes(exercise.id) ? <Check /> : <Plus />}</button></div>)}</div>
    {selected.length > 0 && <div className="atal-selection-bar"><span>{selected.length} seleccionados</span><button type="button" onClick={() => setSelected([])}>Limpiar</button></div>}
  </main></AtalShell>;
}
