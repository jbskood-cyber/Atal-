import type { CSSProperties } from 'react';

type Scale = 'severity' | 'energy';

export function semanticScale(value: number, scale: Scale) {
  if (scale === 'energy') return value <= 3 ? { color: '#dc3f45', label: 'Baja' } : value <= 6 ? { color: '#e0a21a', label: 'Media' } : { color: '#16a36a', label: 'Alta' };
  return value <= 3 ? { color: '#16a36a', label: 'Leve' } : value <= 6 ? { color: '#e0a21a', label: 'Moderada' } : { color: '#dc3f45', label: 'Alta' };
}

export function SemanticSlider({ label, value, onChange, scale = 'severity', min = 0, max = 10 }: { label: string; value: number; onChange: (value: number) => void; scale?: Scale; min?: number; max?: number }) {
  const semantic = semanticScale(value, scale);
  const progress = ((value - min) / (max - min)) * 100;
  return <label className="atal-semantic-slider" style={{ '--semantic-color': semantic.color, '--range-progress': `${progress}%` } as CSSProperties}>
    <span><b>{label}</b><strong>{value}/{max} · {semantic.label}</strong></span>
    <input aria-label={`${label}: ${value} de ${max}, ${semantic.label}`} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <small><span>{scale === 'energy' ? 'Baja' : 'Sin molestia'}</span><span>{scale === 'energy' ? 'Alta' : 'Intensa'}</span></small>
  </label>;
}
