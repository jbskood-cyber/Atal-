'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Filter, Plus, Search } from 'lucide-react';
import { useExerciseCatalog } from '@/src/data/localExercises';
import { AppSelect } from './AppSelect';

export function ExerciseSelector({ initialIds = [], onBack, onConfirm }: { initialIds?: string[]; onBack: () => void; onConfirm: (ids: string[]) => void }) {
  const [selected, setSelected] = useState(initialIds);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Todos');
  const [category, setCategory] = useState('Todas');
  const [difficulty, setDifficulty] = useState('Todas');
  const [equipment, setEquipment] = useState('Todos');
  const allExercises = useExerciseCatalog();
  const regions = useMemo(() => ['Todos', ...new Set(allExercises.map((exercise) => exercise.region))], [allExercises]);
  const categories = useMemo(() => ['Todas', ...new Set(allExercises.map((exercise) => exercise.category))], [allExercises]);
  const difficulties = useMemo(() => ['Todas', ...new Set(allExercises.map((exercise) => exercise.details.difficulty).filter(Boolean))], [allExercises]);
  const equipmentOptions = useMemo(() => ['Todos', ...new Set(allExercises.map((exercise) => exercise.details.equipment).filter(Boolean))], [allExercises]);
  const visible = useMemo(() => allExercises.filter((exercise) =>
    (region === 'Todos' || exercise.region === region) &&
    (category === 'Todas' || exercise.category === category) &&
    (difficulty === 'Todas' || exercise.details.difficulty === difficulty) &&
    (equipment === 'Todos' || exercise.details.equipment === equipment) &&
    `${exercise.name} ${exercise.category} ${exercise.region} ${exercise.details.equipment}`.toLowerCase().includes(query.toLowerCase())
  ), [query, region, category, difficulty, equipment, allExercises]);

  useEffect(() => { document.body.classList.add('atal-context-active'); return () => document.body.classList.remove('atal-context-active'); }, []);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <div className="atal-selector">
    <div className="atal-selector-title"><button type="button" onClick={onBack} aria-label="Volver"><ArrowLeft /></button><div><h1>Ejercicios</h1><p>{selected.length} seleccionados</p></div></div>
    <label className="atal-selector-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicios" /><Filter /></label>
    <div className="atal-region-tabs">{regions.map((value) => <button type="button" key={value} className={region === value ? 'is-active' : ''} onClick={() => setRegion(value)}>{value}</button>)}</div>
    <div className="atal-selector-filters" aria-label="Filtros de ejercicios">
      <label><span>Categoría</span><AppSelect label="Categoría" value={category} options={categories} className="is-compact" onChange={setCategory} /></label>
      <label><span>Dificultad</span><AppSelect label="Dificultad" value={difficulty} options={difficulties} className="is-compact" onChange={setDifficulty} /></label>
      <label><span>Equipo</span><AppSelect label="Equipo" value={equipment} options={equipmentOptions} className="is-compact" onChange={setEquipment} /></label>
    </div>
    <div className="atal-selector-list">{visible.map((exercise) => {
      const checked = selected.includes(exercise.id);
      return <button type="button" key={exercise.id} onClick={() => toggle(exercise.id)} className={checked ? 'is-selected' : ''} aria-pressed={checked}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>{exercise.details.sets} series · {exercise.details.repetitions ?? exercise.details.time ?? 'Dosis por definir'}</small><em>{exercise.region} · {exercise.details.difficulty}</em></span><i>{checked ? <Check /> : <Plus />}</i></button>;
    })}{!visible.length && <p className="atal-empty">Sin resultados</p>}</div>
    <div className="atal-selector-footer"><span><b>{selected.length} seleccionados</b><small>Revisa antes de agregar</small></span><button type="button" onClick={() => onConfirm(selected)} disabled={!selected.length}><Plus /> Agregar</button></div>
  </div>;
}
