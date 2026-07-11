'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, FileText, LockKeyhole, Send, ShieldCheck } from 'lucide-react';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { Avatar } from '@/src/components/atal/Avatar';
import { exercises } from '@/src/data/atal-demo';

export function PortalSessionScreen() {
  const router = useRouter();
  const [completed, setCompleted] = useState<string[]>([]);
  const [painBefore, setPainBefore] = useState(3);
  const [painAfter, setPainAfter] = useState(2);
  const [fatigue, setFatigue] = useState(4);
  const [effort, setEffort] = useState(5);
  const [confidence, setConfidence] = useState(6);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  if (sent) return <main className="atal-patient-portal atal-portal-confirmation"><AtalLogo /><span><Check /></span><h1>Sesión enviada</h1><p>Tu fisioterapeuta recibió el reporte. Gracias por completar tu rutina de hoy.</p><button type="button" className="atal-portal-primary" onClick={() => router.push('/portal')}>Volver a mi plan</button><footer><ShieldCheck /> Tus datos están protegidos.</footer></main>;
  return <main className="atal-patient-portal atal-session-page"><header><AtalLogo /><span><ShieldCheck /> Sesión segura</span></header><section className="atal-session-person"><Avatar name="Paciente Demo 01" /><span><h1>Paciente Demo 01</h1><small>Plan 4/12 · Movilidad funcional</small></span></section><h2>Hoy · Sesión demostrativa</h2><section className="atal-session-exercises">{exercises.slice(0,3).map((exercise) => { const checked=completed.includes(exercise.id); return <button type="button" key={exercise.id} className={checked ? 'is-complete' : ''} onClick={() => setCompleted((current) => checked ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>3 series　•　12 reps</small></span>{checked ? <i><Check /></i> : <ChevronRight />}</button>; })}</section><section className="atal-session-report"><h2>¿Cómo te fue hoy?</h2><p>Completa tu sesión</p><Range label="Dolor antes" value={painBefore} onChange={setPainBefore} /><Range label="Dolor después" value={painAfter} onChange={setPainAfter} /><Range label="Fatiga" value={fatigue} onChange={setFatigue} /><Range label="Esfuerzo percibido" value={effort} onChange={setEffort} /><Range label="Confianza / Dificultad" value={confidence} onChange={setConfidence} /><label className="atal-session-comment"><span>Comentarios <small>(opcional)</small></span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="¿Cómo te sentiste? ¿Alguna molestia o nota importante?" /></label></section><button type="button" className="atal-portal-primary" onClick={() => setSent(true)}><Send /> Enviar sesión</button><button type="button" className="atal-portal-secondary"><FileText /> Ver plan PDF</button><footer><LockKeyhole /> Tus datos están protegidos y son confidenciales.</footer></main>;
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="atal-range"><span><b>{label}</b><strong>{value} / 10</strong></span><input type="range" min="0" max="10" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range': `${value * 10}%` } as React.CSSProperties} /><small><span>0</span><span>5</span><span>10</span></small></label>; }
