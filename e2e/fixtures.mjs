export const STORE_KEY = 'atal:store:v2';
export const CONVERSATIONS_KEY = 'atal:ai-conversations:v1';
export const DRAFTS_KEY = 'atal:ai-drafts:v1';
export const THEME_KEY = 'atal:theme';

export const FIXED_NOW = '2026-07-22T12:00:00.000Z';

export function createState(overrides = {}) {
  const patient = {
    id: 'patient-e2e',
    name: 'Paciente E2E',
    diagnosis: 'Dolor de hombro demostrativo',
    age: 34,
    birthDate: '1992-03-10',
    sex: 'Masculino',
    affectedArea: 'Hombro derecho',
    status: 'active',
    visitType: 'followup',
    contact: {
      phone: '4440000000',
      email: 'privado-e2e@example.test',
      address: 'Dirección privada E2E',
      emergencyContact: 'Contacto privado E2E',
    },
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  const record = {
    id: 'record-e2e',
    patientId: patient.id,
    version: 1,
    date: FIXED_NOW,
    reasonForVisit: 'Recuperar movilidad sin dolor',
    evolution: 'Dos semanas de evolución',
    affectedArea: 'Hombro derecho',
    symptoms: ['Dolor al elevar el brazo'],
    painLevel: 4,
    providedDiagnosis: 'Tendinopatía demostrativa',
    functionalLimitations: ['Vestirse'],
    goals: ['Elevar el brazo con comodidad'],
    relevantHistory: [],
    precautions: ['Evitar dolor intenso'],
    clinicalNotes: 'Datos completamente ficticios.',
    planId: 'plan-active-e2e',
    professional: 'Fisioterapeuta E2E',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  const exercise = {
    id: 'exercise-e2e',
    name: 'Movilidad asistida E2E',
    region: 'Hombro',
    category: 'Movilidad',
    objective: 'Recuperar rango de movimiento',
    startingPosition: 'Sentado con apoyo',
    instructions: ['Mover lentamente', 'Detenerse ante dolor alto'],
    precautions: 'No superar dolor 5/10',
    equipment: 'Bastón',
    difficulty: 'Inicial',
    sets: 3,
    repetitions: 10,
    rest: '30 segundos',
    maxPain: 5,
    tags: ['hombro', 'movilidad'],
    notes: '',
    media: { type: 'none' },
    status: 'active',
    source: 'local',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  const activePlan = {
    id: 'plan-active-e2e',
    patientId: patient.id,
    title: 'Plan activo E2E',
    focus: 'Movilidad y control',
    duration: '6 semanas',
    frequency: '3 veces por semana',
    goal: 'Elevar el brazo con comodidad',
    exerciseIds: [exercise.id],
    status: 'active',
    progression: 'Aumentar rango según tolerancia',
    reportCriteria: 'Reportar dolor mayor a 7/10',
    generalInstructions: 'Realizar con control.',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  const draftPlan = {
    ...activePlan,
    id: 'plan-draft-e2e',
    title: 'Plan candidato E2E',
    status: 'draft',
  };

  const session = {
    id: 'session-e2e',
    patientId: patient.id,
    planId: activePlan.id,
    startedAt: '2026-07-21T12:00:00.000Z',
    completedAt: '2026-07-21T12:30:00.000Z',
    status: 'completed',
    startPain: 4,
    startEnergy: 7,
    startComment: '',
    exercises: [],
    endPain: 3,
    endEnergy: 6,
    effort: 5,
    symptoms: [],
    comment: 'Sesión demostrativa completada.',
    easiest: 'Movilidad asistida',
    hardest: 'Elevación final',
    discomfort: '',
    durationMinutes: 30,
    clinicalObservation: '',
    createdAt: '2026-07-21T12:30:00.000Z',
    updatedAt: '2026-07-21T12:30:00.000Z',
  };

  const state = {
    version: 2,
    seededAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    patients: [patient],
    plans: [activePlan, draftPlan],
    exercises: [exercise],
    clinicalRecords: [record],
    clinicalRecordVersions: [],
    sessions: [session],
    notes: [],
    events: [],
    notifications: [],
    settings: {
      notifications: true,
      haptics: false,
      compact: true,
      professionalName: 'Fisioterapeuta E2E',
      specialty: 'Fisioterapia',
      clinic: 'Clínica E2E',
      sessionLock: true,
      clinicalPrivacy: true,
      aiSuggestions: true,
      aiAlerts: true,
      aiInstructions: 'Usa únicamente datos demostrativos.',
    },
    feedback: [],
  };

  return {
    ...state,
    ...overrides,
    settings: { ...state.settings, ...(overrides.settings ?? {}) },
  };
}

export function createConversation({
  id = 'conversation-e2e',
  draftId = 'draft-e2e',
  intent = 'summarize_patient',
  patientMode = 'existing',
  selectedPatientId = 'patient-e2e',
  selectedPlanId = '',
  selectedExerciseId = '',
  messages = [],
  status = 'empty',
} = {}) {
  return {
    id,
    draftId,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    status,
    composerText: '',
    transcription: '',
    messages,
    attachmentMetadata: [],
    privateContact: { phone: '', email: '', address: '', emergencyContact: '' },
    workContext: {
      intent,
      patientMode,
      selectedPatientId,
      selectedPlanId,
      selectedExerciseId,
    },
  };
}

export function createDraftResponse({
  intent = 'summarize_patient',
  responseMode = 'query',
  assistantMessage = 'Respuesta E2E preparada.',
  selectedPatientId = 'patient-e2e',
  selectedPlanId = '',
  selectedExerciseId = '',
  command = null,
  patient = {},
  plan = {},
  exercises = [],
  missingFields = [],
  uncertainFields = [],
  contradictions = [],
  followUpQuestion = '',
  proposedActions = [],
} = {}) {
  return {
    draft: {
      intent,
      selectedPatientId,
      selectedPlanId,
      selectedExerciseId,
      responseMode,
      assistantMessage,
      command,
      patient: {
        name: '',
        age: null,
        birthDate: '',
        sex: '',
        reasonForVisit: '',
        affectedArea: '',
        evolutionTime: '',
        providedDiagnosis: '',
        painLevel: null,
        symptoms: [],
        functionalLimitations: [],
        goals: [],
        relevantHistory: [],
        precautions: [],
        clinicalNotes: '',
        ...patient,
      },
      plan: {
        title: '',
        goal: '',
        focus: '',
        duration: { value: null, unit: 'custom', customText: '' },
        frequency: { value: null, period: 'custom', customText: '' },
        phases: [],
        generalInstructions: '',
        progressCriteria: '',
        status: 'draft',
        ...plan,
      },
      exercises,
      missingFields,
      uncertainFields,
      contradictions,
      followUpQuestion,
      proposedActions,
    },
  };
}

export function commandFixture(type, overrides = {}) {
  return {
    type,
    patientId: '',
    planId: '',
    exerciseId: '',
    sessionId: '',
    query: '',
    content: '',
    exportType: '',
    settings: {},
    ...overrides,
  };
}

export async function seedBrowser(page, {
  state = createState(),
  conversations = [],
  drafts = [],
  theme = 'light',
} = {}) {
  await page.addInitScript(({ stateValue, conversationValue, draftValue, themeValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify(conversationValue));
    localStorage.setItem(keys.drafts, JSON.stringify(draftValue));
    localStorage.setItem(keys.theme, themeValue);
  }, {
    stateValue: state,
    conversationValue: conversations,
    draftValue: drafts,
    themeValue: theme,
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

export async function mockAnalyze(page, responseOrFactory) {
  await page.route('**/api/atal-ai/analyze', async (route) => {
    const request = route.request();
    const payload = request.postDataJSON();
    const response = typeof responseOrFactory === 'function'
      ? await responseOrFactory(payload)
      : responseOrFactory;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

export async function readStore(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORE_KEY);
}

export async function readDrafts(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), DRAFTS_KEY);
}
