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
  status: 'active' | 'draft' | 'paused' | 'completed' | 'archived';
  phase: string;
};

export type Exercise = {
  id: string;
  name: string;
  region: string;
  category: string;
  image: string;
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
  { id: 'p13', name: 'Paciente Demo 13', diagnosis: 'Dolor cervical demostrativo', plan: 'Sin plan', progress: 0, time: 'Sin sesiones', status: 'active', adherence: 0 },
  { id: 'p14', name: 'Paciente Demo 14', diagnosis: 'Recuperación de hombro', plan: 'Plan pausado', progress: 55, time: '1 jun, 12:20', status: 'attention', adherence: 55 },
  { id: 'p15', name: 'Paciente Demo 15', diagnosis: 'Alta funcional demostrativa', plan: 'Plan completado', progress: 100, time: '30 may, 17:05', status: 'active', adherence: 100 },
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
  { id: 'pl09', title: 'Movilidad cervical', patient: 'Paciente Demo 14', duration: '6 semanas', frequency: '3x por semana', updated: 'Actualizado 1 jun, 12:20 p.m.', status: 'paused', phase: 'Pausado' },
  { id: 'pl10', title: 'Retorno funcional', patient: 'Paciente Demo 15', duration: '8 semanas', frequency: '3x por semana', updated: 'Actualizado 30 may, 5:05 p.m.', status: 'completed', phase: 'Completado' },
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
  ['e15', 'Deslizamiento cervical', 'Cuello', 'Movilidad'],
  ['e16', 'Peso muerto con banda', 'Cadera', 'Fuerza'],
  ['e17', 'Equilibrio unipodal', 'Tobillo', 'Propiocepción'],
  ['e18', 'Press escapular', 'Hombro', 'Fuerza'],
].map(([id, name, region, category], index) => ({ id, name, region, category, image: exerciseImages[index % exerciseImages.length] }));

export const statusColor: Record<PatientStatus, string> = {
  active: '#00a66a',
  attention: '#e5a000',
  archived: '#7f8582',
};
