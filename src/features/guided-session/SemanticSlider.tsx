import type { CSSProperties } from 'react';

type Scale = 'severity' | 'energy';

export function semanticScale(value: number, scale: Scale, min: number, max: number) {
  const ratio = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const level = ratio < 1 / 3 ? 'low' : ratio < 2 / 3 ? 'medium' : 'high';
  if (scale === 'energy') return level === 'low' ? { color: '#64748b', label: 'Baja' } : level === 'medium' ? { color: '#2563eb', label: 'Media' } : { color: '#16a36a', label: 'Alta' };
  return level === 'low' ? { color: '#16a36a', label: 'Leve' } : level === 'medium' ? { color: '#2563eb', label: 'Moderada' } : { color: '#173b72', label: 'Alta' };
}

export function SemanticSlider({ label, value, onChange, scale = 'severity', min = 0, max = 10 }: { label: string; value: number; onChange: (value: number) => void; scale?: Scale; min?: number; max?: number }) {
  const semantic = semanticScale(value, scale, min, max);
  const progress = max === min ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return <label className="atal-semantic-slider" style={{ '--semantic-color': semantic.color, '--range-progress': `${progress}%` } as CSSProperties}>
    <span><b>{label}</b><strong>{value}/{max} · {semantic.label}</strong></span>
    <input aria-label={`${label}: ${value} de ${max}, ${semantic.label}`} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <small><span>{scale === 'energy' ? 'Baja' : 'Sin molestia'}</span><span>{scale === 'energy' ? 'Alta' : 'Intensa'}</span></small>
  </label>;
}
