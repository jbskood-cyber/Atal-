'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Filter, Plus, Search } from 'lucide-react';
import { exercises } from '@/src/data/atal-demo';

const regions = ['Rodilla', 'Cadera', 'Hombro', 'Columna'];

export function ExerciseSelector({ initialIds = [], onBack, onConfirm }: { initialIds?: string[]; onBack: () => void; onConfirm: (ids: string[]) => void }) {
  const [selected, setSelected] = useState(initialIds);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Rodilla');
  const visible = useMemo(() => exercises.filter((exercise) => exercise.region === region && exercise.name.toLowerCase().includes(query.toLowerCase())), [query, region]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return <div className="atal-selector">
    <div className="atal-selector-title"><button type="button" onClick={onBack}><ArrowLeft /></button><div><h1>Selector de ejercicios</h1><p>Busca y selecciona ejercicios para tu plan.</p></div></div>
    <label className="atal-selector-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicios" /><Filter /></label>
    <div className="atal-region-tabs">{regions.map((value) => <button type="button" key={value} className={region === value ? 'is-active' : ''} onClick={() => setRegion(value)}>{value}</button>)}</div>
    <div className="atal-selector-list">{visible.map((exercise) => {
      const checked = selected.includes(exercise.id);
      return <button type="button" key={exercise.id} onClick={() => toggle(exercise.id)} className={checked ? 'is-selected' : ''}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>3 series　•　12 repeticiones</small><em>{exercise.region}</em></span><i>{checked ? <Check /> : <Plus />}</i></button>;
    })}</div>
    <div className="atal-selector-footer"><span><b>{selected.length} seleccionados</b><small>Puedes agregar más ejercicios</small></span><button type="button" onClick={() => onConfirm(selected)} disabled={!selected.length}><Plus /> Agregar al plan</button></div>
  </div>;
}
