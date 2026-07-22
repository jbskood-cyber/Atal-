export const CORE_NOW = '2026-07-21T18:00:00.000Z';

export function patient(id = 'patient-1', name = 'Paciente Uno') {
  return {
    id,
    name,
    diagnosis: '',
    age: null,
    birthDate: '',
    sex: '',
    affectedArea: 'Rodilla',
    status: 'active',
    visitType: 'first',
    contact: { phone: '', email: '', address: '', emergencyContact: '' },
    createdAt: CORE_NOW,
    updatedAt: CORE_NOW,
  };
}

export function exercise(id = 'exercise-1', name = 'Movilidad') {
  return {
    id,
    name,
    region: 'Rodilla',
    category: 'Movilidad',
    objective: '',
    startingPosition: '',
    instructions: [],
    precautions: '',
    equipment: '',
    difficulty: '',
    sets: 1,
    repetitions: 10,
    rest: '',
    maxPain: 3,
    tags: [],
    notes: '',
    media: { type: 'none' },
    status: 'active',
    source: 'local',
    createdAt: CORE_NOW,
    updatedAt: CORE_NOW,
  };
}

export function plan(id = 'plan-1', patientId = 'patient-1', exerciseIds = ['exercise-1']) {
  return {
    id,
    patientId,
    title: 'Plan inicial',
    focus: '',
    duration: '',
    frequency: '',
    goal: '',
    exerciseIds,
    status: 'active',
    progression: '',
    reportCriteria: '',
    generalInstructions: '',
    createdAt: CORE_NOW,
    updatedAt: CORE_NOW,
  };
}

export function record(id = 'record-1', patientId = 'patient-1', planId = 'plan-1') {
  return {
    id,
    patientId,
    version: 1,
    date: '2026-07-21',
    reasonForVisit: 'Rodilla',
    evolution: '',
    affectedArea: 'Rodilla',
    symptoms: [],
    painLevel: 2,
    providedDiagnosis: '',
    functionalLimitations: [],
    goals: [],
    relevantHistory: [],
    precautions: [],
    clinicalNotes: '',
    planId,
    professional: '',
    createdAt: CORE_NOW,
    updatedAt: CORE_NOW,
  };
}

export function session(id = 'session-1', patientId = 'patient-1', planId = 'plan-1') {
  return {
    id,
    patientId,
    planId,
    startedAt: CORE_NOW,
    completedAt: CORE_NOW,
    status: 'completed',
    startPain: 2,
    startEnergy: 5,
    startComment: '',
    exercises: {},
    endPain: 2,
    endEnergy: 5,
    effort: 3,
    symptoms: ['ninguno'],
    comment: '',
    easiest: '',
    hardest: '',
    discomfort: '',
    durationMinutes: 10,
    clinicalObservation: '',
    createdAt: CORE_NOW,
    updatedAt: CORE_NOW,
  };
}

export function validState() {
  return {
    version: 2,
    seededAt: CORE_NOW,
    updatedAt: CORE_NOW,
    patients: [patient()],
    plans: [plan()],
    exercises: [exercise()],
    clinicalRecords: [record()],
    clinicalRecordVersions: [],
    sessions: [session()],
    notes: [],
    events: [{ id: 'event-unrelated', kind: 'patient_created', patientId: 'patient-1', title: 'Paciente', detail: 'Uno', createdAt: CORE_NOW }],
    notifications: [{ id: 'notification-unrelated', title: 'Previo', detail: '', severity: 'stable', href: '/', read: false, createdAt: CORE_NOW }],
    settings: {
      notifications: true,
      haptics: true,
      compact: true,
      professionalName: '',
      specialty: '',
      clinic: '',
      sessionLock: true,
      clinicalPrivacy: true,
      aiSuggestions: true,
      aiAlerts: true,
      aiInstructions: '',
    },
    feedback: [],
  };
}

export function memoryPort(initial = validState()) {
  let state = structuredClone(initial);
  let mutations = 0;
  return {
    read: () => state,
    mutate(mutator) {
      mutations += 1;
      const candidate = structuredClone(state);
      mutator(candidate);
      state = candidate;
      return state;
    },
    mutationCount: () => mutations,
  };
}

export function context(patch = {}) {
  return {
    conversationId: 'conversation-1',
    draftId: 'draft-1',
    route: '/atal-ai',
    selectedPatientId: 'patient-1',
    selectedPlanId: 'plan-1',
    selectedExerciseId: 'exercise-1',
    selectedSessionId: 'session-1',
    now: CORE_NOW,
    ...patch,
  };
}
