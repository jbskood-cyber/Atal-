import { ATAL_STORE_KEY, ATAL_STORE_VERSION, type AtalState } from './atalStore';
import { exercises as demoExercises, patients as demoPatients, plans as demoPlans } from './atal-demo';

const LEGACY_WORKSPACE_KEYS = [
  'atal:local-patients:v1',
  'atal:local-exercises:v1',
  'atal:local-plans:v1',
  'atal:clinical-records:v1',
] as const;

function timestamp() {
  return new Date().toISOString();
}

export function createEmptyWorkspaceState(now = timestamp()): AtalState {
  return {
    version: ATAL_STORE_VERSION,
    seededAt: now,
    updatedAt: now,
    patients: [],
    plans: [],
    exercises: [],
    clinicalRecords: [],
    clinicalRecordVersions: [],
    sessions: [],
    notes: [],
    events: [],
    notifications: [],
    settings: {
      notifications: true,
      haptics: true,
      compact: true,
      professionalName: 'Fisioterapeuta',
      specialty: 'Fisioterapeuta',
      clinic: '',
      sessionLock: true,
      clinicalPrivacy: true,
      aiSuggestions: true,
      aiAlerts: true,
      aiInstructions: 'Prioriza claridad, seguridad clínica y decisiones fáciles de revisar.',
    },
    feedback: [],
  };
}

export function hasLegacyWorkspaceData(storage: Pick<Storage, 'getItem'>) {
  return LEGACY_WORKSPACE_KEYS.some((key) => {
    const raw = storage.getItem(key);
    if (!raw) return false;
    try {
      const value = JSON.parse(raw) as unknown;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value && typeof value === 'object');
    } catch {
      return false;
    }
  });
}

export function bootstrapRealWorkspace() {
  if (typeof window === 'undefined') return;
  const storage = window.localStorage;
  if (storage.getItem(ATAL_STORE_KEY)) return;
  if (hasLegacyWorkspaceData(storage)) return;
  storage.setItem(ATAL_STORE_KEY, JSON.stringify(createEmptyWorkspaceState()));
}

export function initializeDemoWorkspace() {
  if (typeof window === 'undefined') return;
  const now = timestamp();
  const state = createEmptyWorkspaceState(now);
  state.patients = demoPatients.map((patient) => ({
    id: patient.id,
    name: patient.name,
    diagnosis: patient.diagnosis,
    age: null,
    birthDate: '',
    sex: '',
    affectedArea: '',
    status: patient.status,
    visitType: 'first',
    contact: { phone: '', email: '', address: '', emergencyContact: '' },
    createdAt: now,
    updatedAt: now,
  }));
  state.exercises = demoExercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    region: exercise.region,
    category: exercise.category,
    objective: 'Mejorar el movimiento de forma progresiva.',
    startingPosition: 'Colócate en una posición cómoda y estable.',
    instructions: ['Realiza el movimiento con control.', 'Respira con normalidad y evita compensaciones.'],
    precautions: 'Detente si aparece dolor fuerte o una molestia fuera de lo indicado.',
    equipment: 'Según indicación',
    difficulty: 'Inicial',
    sets: 3,
    repetitions: 10,
    rest: '30 segundos',
    maxPain: 3,
    tags: [exercise.region, exercise.category],
    notes: '',
    media: { type: 'image' },
    status: 'active',
    source: 'seed',
    createdAt: now,
    updatedAt: now,
  }));
  state.plans = demoPlans.map((plan, index) => ({
    id: plan.id,
    patientId: state.patients.find((patient) => patient.name === plan.patient)?.id ?? state.patients[index % Math.max(1, state.patients.length)]?.id ?? '',
    title: plan.title,
    focus: plan.phase,
    duration: plan.duration,
    frequency: plan.frequency,
    goal: 'Recuperar función y tolerancia al movimiento.',
    exerciseIds: state.exercises.slice(index % 6, index % 6 + 3).map((exercise) => exercise.id),
    status: plan.status,
    progression: 'Aumentar según tolerancia y calidad del movimiento.',
    reportCriteria: 'Reportar dolor elevado, síntomas o imposibilidad para completar.',
    generalInstructions: 'Realiza los ejercicios con calma y sigue las indicaciones de tu fisioterapeuta.',
    createdAt: now,
    updatedAt: now,
  }));
  state.settings.professionalName = 'Cuenta demo';
  window.localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(state));
  window.location.reload();
}

export function resetWorkspaceToEmpty() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(createEmptyWorkspaceState()));
  window.location.reload();
}
