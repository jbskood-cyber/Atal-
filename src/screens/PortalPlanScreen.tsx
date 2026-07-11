'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, Clock3, FileText, LockKeyhole, Target } from 'lucide-react';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { exercises } from '@/src/data/atal-demo';

export function PortalPlanScreen() {
  const router = useRouter();
  return <main className="atal-patient-portal"><header><AtalLogo /><span><LockKeyhole /> Enlace seguro</span></header><section className="atal-portal-welcome"><small>Hola,</small><h1>Paciente Demo 01</h1><b><CalendarDays /> Rehabilitación — Fase 1</b><p>Tu plan está listo. Sigue tus ejercicios y avanza cada día más.</p></section><section className="atal-portal-facts"><PortalFact icon={<CalendarDays />} value="3 sesiones" label="por semana" /><PortalFact icon={<Clock3 />} value="4 semanas" label="de duración" /><PortalFact icon={<Target />} value="Mejorar" label="fuerza y movilidad" /></section><section className="atal-portal-exercises"><h2>Ejercicios de hoy</h2>{exercises.slice(0,5).map((exercise) => <button type="button" key={exercise.id} onClick={() => router.push('/portal/session')}><img src={exercise.image} alt="" /><span><b>{exercise.name}</b><small>3 series　•　12 reps</small></span><ChevronRight /></button>)}</section><button type="button" className="atal-portal-primary" onClick={() => router.push('/portal/session')}><LockKeyhole /> Iniciar sesión</button><p className="atal-portal-help">Accede para marcar ejercicios como completados y ver tu progreso.</p><button type="button" className="atal-portal-secondary"><FileText /> Ver plan en PDF</button><footer><LockKeyhole /> Enlace seguro y privado. Sin registro requerido.</footer></main>;
}
function PortalFact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <span><i>{icon}</i><b>{value}</b><small>{label}</small></span>; }
