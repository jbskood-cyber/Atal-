export type PatientStatus = 'active' | 'attention' | 'archived';

export type Patient = {
  id: string;
  name: string;
  diagnosis: string;
  plan: string;
  progress: number;
  time: string;
  status: PatientStatus;
  adherence: number;
};

export type Plan = {
  id: string;
  title: string;
  patient: string;
  duration: string;
  frequency: string;
  updated: string;
  status: 'active' | 'draft' | 'archived';
  phase: string;
};

export type Exercise = {
  id: string;
  name: string;
  region: string;
  category: string;
  image: string;
};

export type TrackingEntry = {
  id: string;
  patient: string;
  diagnosis: string;
  pain: number;
  fatigue: number;
  adherence: number;
  time: string;
  status: 'new' | 'attention' | 'reviewed';
  plan: string;
};

export const patients: Patient[] = [
  { id: 'p01', name: 'Paciente Demo 01', diagnosis: 'Caso demostrativo A', plan: 'Plan 4/12', progress: 78, time: 'Hoy, 9:22', status: 'active', adherence: 78 },
  { id: 'p02', name: 'Paciente Demo 02', diagnosis: 'Caso demostrativo B', plan: 'Plan 2/8', progress: 25, time: 'Hoy, 8:47', status: 'attention', adherence: 92 },
  { id: 'p03', name: 'Paciente Demo 03', diagnosis: 'Caso demostrativo C', plan: 'Plan 3/10', progress: 30, time: 'Ayer, 8:15', status: 'active', adherence: 64 },
  { id: 'p04', name: 'Paciente Demo 04', diagnosis: 'Caso demostrativo D', plan: 'Plan 5/12', progress: 42, time: 'Ayer, 17:30', status: 'active', adherence: 85 },
  { id: 'p05', name: 'Paciente Demo 05', diagnosis: 'Caso demostrativo E', plan: 'Plan 1/6', progress: 16, time: 'Ayer, 11:05', status: 'archived', adherence: 71 },
  { id: 'p06', name: 'Paciente Demo 06', diagnosis: 'Caso demostrativo F', plan: 'Plan 2/6', progress: 28, time: 'Ayer, 10:12', status: 'attention', adherence: 88 },
  { id: 'p07', name: 'Paciente Demo 07', diagnosis: 'Caso demostrativo G', plan: 'Plan 1/8', progress: 12, time: 'Ayer, 9:08', status: 'active', adherence: 82 },
  { id: 'p08', name: 'Paciente Demo 08', diagnosis: 'Caso demostrativo H', plan: 'Plan 4/10', progress: 40, time: '3 jun, 16:45', status: 'active', adherence: 76 },
  { id: 'p09', name: 'Paciente Demo 09', diagnosis: 'Caso demostrativo I', plan: 'Plan 3/8', progress: 38, time: '3 jun, 15:20', status: 'attention', adherence: 69 },
  { id: 'p10', name: 'Paciente Demo 10', diagnosis: 'Caso demostrativo J', plan: 'Plan 2/6', progress: 20, time: '3 jun, 11:40', status: 'archived', adherence: 61 },
  { id: 'p11', name: 'Paciente Demo 11', diagnosis: 'Caso demostrativo K', plan: 'Plan 3/9', progress: 33, time: '2 jun, 18:22', status: 'active', adherence: 84 },
  { id: 'p12', name: 'Paciente Demo 12', diagnosis: 'Caso demostrativo L', plan: 'Plan 2/8', progress: 25, time: '2 jun, 14:05', status: 'attention', adherence: 67 },
];

export const plans: Plan[] = [
  { id: 'pl01', title: 'Rehabilitación — Fase 1', patient: 'Paciente Demo 01', duration: '4 semanas', frequency: '3x por semana', updated: 'Actualizado hoy, 8:45 a.m.', status: 'active', phase: 'Fase 2 de 4' },
  { id: 'pl02', title: 'Plan funcional progresivo', patient: 'Paciente Demo 02', duration: '6 semanas', frequency: '2x por semana', updated: 'Actualizado ayer, 6:20 p.m.', status: 'active', phase: 'Fase 1 de 3' },
  { id: 'pl03', title: 'Movilidad y control', patient: 'Paciente Demo 03', duration: '5 semanas', frequency: '3x por semana', updated: 'Actualizado ayer, 2:10 p.m.', status: 'active', phase: 'Fase 2 de 3' },
  { id: 'pl04', title: 'Recuperación — Fase 2', patient: 'Paciente Demo 04', duration: '8 semanas', frequency: '3x por semana', updated: 'Actualizado 20 may, 10:15 a.m.', status: 'active', phase: 'Fase 3 de 5' },
  { id: 'pl05', title: 'Estabilidad y fuerza', patient: 'Paciente Demo 06', duration: '4 semanas', frequency: '2x por semana', updated: 'Actualizado 19 may, 5:30 p.m.', status: 'active', phase: 'Fase 1 de 2' },
  { id: 'pl06', title: 'Plan de movilidad', patient: 'Paciente Demo 07', duration: '3 semanas', frequency: '2x por semana', updated: 'Actualizado 18 may, 9:05 p.m.', status: 'draft', phase: 'Borrador' },
  { id: 'pl07', title: 'Fortalecimiento gradual', patient: 'Paciente Demo 08', duration: '6 semanas', frequency: '3x por semana', updated: 'Actualizado 17 may, 4:20 p.m.', status: 'draft', phase: 'Borrador' },
  { id: 'pl08', title: 'Control postural', patient: 'Paciente Demo 09', duration: '4 semanas', frequency: '2x por semana', updated: 'Actualizado 16 may, 11:30 a.m.', status: 'archived', phase: 'Finalizado' },
];

const exerciseImages = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=300&q=80',
];

export const exercises: Exercise[] = [
  ['e01', 'Sentadilla asistida', 'Rodilla', 'Fuerza'],
  ['e02', 'Elevación de pierna recta', 'Rodilla', 'Movilidad'],
  ['e03', 'Puente de glúteos', 'Cadera', 'Fuerza'],
  ['e04', 'Clamshell', 'Cadera', 'Estabilidad'],
  ['e05', 'Step Up', 'Rodilla', 'Fuerza'],
  ['e06', 'Elevación de talones', 'Tobillo', 'Fuerza'],
  ['e07', 'Bird Dog', 'Columna', 'Estabilidad'],
  ['e08', 'Plancha lateral', 'Columna', 'Estabilidad'],
  ['e09', 'Wall Sit', 'Rodilla', 'Resistencia'],
  ['e10', 'Estiramiento de isquiotibia', 'Pierna', 'Flexibilidad'],
  ['e11', 'Movilización de cadera 90/90', 'Cadera', 'Movilidad'],
  ['e12', 'Curl nórdico asistido', 'Rodilla', 'Fuerza'],
  ['e13', 'Retracción escapular', 'Hombro', 'Estabilidad'],
  ['e14', 'Rotación externa con banda', 'Hombro', 'Estabilidad'],
].map(([id, name, region, category], index) => ({ id, name, region, category, image: exerciseImages[index % exerciseImages.length] }));

export const statusColor: Record<PatientStatus, string> = {
  active: '#00a66a',
  attention: '#f4a61d',
  archived: '#7f8582',
};

export const trackingEntries: TrackingEntry[] = [
  { id: 'r01', patient: 'Paciente Demo 01', diagnosis: 'Movilidad funcional', pain: 4, fatigue: 5, adherence: 87, time: '9:22 a.m.', status: 'new', plan: 'Rehabilitación — Fase 1' },
  { id: 'r02', patient: 'Paciente Demo 02', diagnosis: 'Rodilla · Postquirúrgico', pain: 6, fatigue: 6, adherence: 62, time: '8:47 a.m.', status: 'attention', plan: 'Plan funcional — Fase 2' },
  { id: 'r03', patient: 'Paciente Demo 03', diagnosis: 'Hombro · Tendinopatía', pain: 3, fatigue: 3, adherence: 92, time: '8:15 a.m.', status: 'new', plan: 'Movilidad — Fase 1' },
  { id: 'r04', patient: 'Paciente Demo 04', diagnosis: 'Cervicalgia', pain: 5, fatigue: 4, adherence: 78, time: 'Ayer, 7:32 p.m.', status: 'attention', plan: 'Control postural' },
  { id: 'r05', patient: 'Paciente Demo 05', diagnosis: 'Telehealth · Lumbalgia', pain: 2, fatigue: 2, adherence: 95, time: 'Ayer, 6:10 p.m.', status: 'reviewed', plan: 'Fuerza progresiva' },
  { id: 'r06', patient: 'Paciente Demo 06', diagnosis: 'Tobillo · Movilidad', pain: 3, fatigue: 4, adherence: 84, time: 'Ayer, 5:30 p.m.', status: 'new', plan: 'Retorno gradual' },
];
