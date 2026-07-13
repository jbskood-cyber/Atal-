import type { Symptom } from './types';

const symptoms: { id: Symptom; label: string }[] = [{ id: 'dolor', label: 'Dolor' }, { id: 'hormigueo', label: 'Hormigueo' }, { id: 'adormecimiento', label: 'Adormecimiento' }, { id: 'inflamación', label: 'Inflamación' }, { id: 'mareo', label: 'Mareo' }, { id: 'otro', label: 'Otro' }, { id: 'ninguno', label: 'Ninguno' }];

export function toggleSymptom(current: Symptom[], symptom: Symptom) {
  if (symptom === 'ninguno') return current.includes('ninguno') ? [] : ['ninguno'] as Symptom[];
  const withoutNone = current.filter((item) => item !== 'ninguno');
  return withoutNone.includes(symptom) ? withoutNone.filter((item) => item !== symptom) : [...withoutNone, symptom];
}

export function SymptomPicker({ value, onChange }: { value: Symptom[]; onChange: (value: Symptom[]) => void }) {
  return <div className="atal-symptom-picker" role="group" aria-label="Síntomas">{symptoms.map((symptom) => <button type="button" aria-pressed={value.includes(symptom.id)} className={value.includes(symptom.id) ? 'is-active' : ''} key={symptom.id} onClick={() => onChange(toggleSymptom(value, symptom.id))}>{symptom.label}</button>)}</div>;
}
