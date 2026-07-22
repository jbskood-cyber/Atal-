import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const resolverModule = () => loadCore('src/features/atal-ai/core/entityResolver.js');
const timestamp = '2026-07-21T18:00:00.000Z';

function patient(id, name) {
  return {
    id,
    name,
    diagnosis: '',
    age: null,
    birthDate: '',
    sex: '',
    affectedArea: '',
    status: 'active',
    visitType: 'first',
    contact: { phone: '', email: '', address: '', emergencyContact: '' },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function plan(id, patientId, title, status = 'draft') {
  return {
    id,
    patientId,
    title,
    focus: '',
    duration: '',
    frequency: '',
    goal: '',
    exerciseIds: ['exercise-knee'],
    status,
    progression: '',
    reportCriteria: '',
    generalInstructions: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function exercise(id, name, region) {
  return {
    id,
    name,
    region,
    category: 'Movilidad',
    objective: '',
    startingPosition: '',
    instructions: [],
    precautions: '',
    equipment: '',
    difficulty: '',
    sets: 1,
    rest: '',
    maxPain: null,
    tags: [],
    notes: '',
    media: { type: 'none' },
    status: 'active',
    source: 'local',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function fixture() {
  const patients = [
    patient('patient-jose-1', 'José Álvarez'),
    patient('patient-jose-2', 'Jose  Alvarez'),
    patient('patient-maria', 'María Torres'),
  ];
  const plans = [
    plan('plan-jose', 'patient-jose-1', 'Rodilla inicial', 'active'),
    plan('plan-maria', 'patient-maria', 'Rodilla inicial'),
  ];
  const exercises = [
    exercise('exercise-knee', 'Movilidad suave', 'Rodilla'),
    exercise('exercise-shoulder', 'Movilidad suave', 'Hombro'),
  ];
  const sessions = [
    {
      id: 'session-jose',
      patientId: 'patient-jose-1',
      planId: 'plan-jose',
      startedAt: timestamp,
      completedAt: timestamp,
      status: 'completed',
      startPain: 1,
      startEnergy: 5,
      startComment: '',
      exercises: {},
      endPain: 1,
      endEnergy: 5,
      effort: 2,
      symptoms: ['ninguno'],
      comment: '',
      easiest: '',
      hardest: '',
      discomfort: '',
      durationMinutes: 10,
      clinicalObservation: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const clinicalRecords = [
    {
      id: 'record-jose',
      patientId: 'patient-jose-1',
      version: 1,
      date: '2026-07-21',
      reasonForVisit: 'Rodilla',
      evolution: '',
      affectedArea: 'Rodilla',
      symptoms: [],
      painLevel: 1,
      providedDiagnosis: '',
      functionalLimitations: [],
      goals: [],
      relevantHistory: [],
      precautions: [],
      clinicalNotes: '',
      planId: 'plan-jose',
      professional: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  return {
    version: 2,
    seededAt: timestamp,
    updatedAt: timestamp,
    patients,
    plans,
    exercises,
    clinicalRecords,
    clinicalRecordVersions: [],
    sessions,
    notes: [],
    events: [],
    notifications: [],
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

function invocation(references) {
  return { tool: 'test.resolve', version: 1, input: {}, references, proposalId: 'proposal-1' };
}

function context(patch = {}) {
  return {
    conversationId: 'conversation-1',
    draftId: 'draft-1',
    route: '/atal-ai',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
    selectedSessionId: '',
    now: timestamp,
    ...patch,
  };
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDeep(child);
  }
  return value;
}

test('valid explicit ID wins over label and selected context', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(
    fixture(),
    invocation([{ type: 'patient', id: 'patient-maria', label: 'José Álvarez' }]),
    context({ selectedPatientId: 'patient-jose-1' }),
  );
  assert.equal(result.status, 'resolved');
  assert.equal(result.entities.patient.id, 'patient-maria');
});

test('invalid explicit ID does not fall back to context or a valid label', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(
    fixture(),
    invocation([{ type: 'patient', id: 'missing', label: 'María Torres' }]),
    context({ selectedPatientId: 'patient-maria' }),
  );
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_NOT_FOUND');
});

test('selected context resolves only its matching requested type', () => {
  const { resolveEntities } = resolverModule();
  const state = fixture();
  const patientResult = resolveEntities(state, invocation([{ type: 'patient' }]), context({ selectedPatientId: 'patient-maria' }));
  assert.equal(patientResult.entities.patient.id, 'patient-maria');

  const planResult = resolveEntities(state, invocation([{ type: 'plan' }]), context({ selectedPatientId: 'patient-maria' }));
  assert.equal(planResult.status, 'clarification');
  assert.equal(planResult.clarification.code, 'ENTITY_NOT_FOUND');
});

test('unique normalized label resolves accents case and whitespace', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(fixture(), invocation([{ type: 'patient', label: '  MARÍA   TORRES ' }]), context());
  assert.equal(result.status, 'resolved');
  assert.equal(result.entities.patient.id, 'patient-maria');
});

test('duplicate normalized labels return deterministic candidates', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(fixture(), invocation([{ type: 'patient', label: 'Jose Alvarez' }]), context());
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_AMBIGUOUS');
  assert.deepEqual(result.clarification.candidates.map((candidate) => candidate.id), ['patient-jose-1', 'patient-jose-2']);
});

test('duplicate exercise names across regions remain ambiguous', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(fixture(), invocation([{ type: 'exercise', label: 'movilidad suave' }]), context());
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_AMBIGUOUS');
});

test('resolved plan must belong to the resolved patient', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(
    fixture(),
    invocation([
      { type: 'patient', id: 'patient-maria' },
      { type: 'plan', id: 'plan-jose' },
    ]),
    context(),
  );
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_RELATION_INVALID');
});

test('resolved session must match resolved patient and plan', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(
    fixture(),
    invocation([
      { type: 'patient', id: 'patient-maria' },
      { type: 'plan', id: 'plan-maria' },
      { type: 'session', id: 'session-jose' },
    ]),
    context(),
  );
  assert.equal(result.status, 'clarification');
  assert.equal(result.clarification.code, 'ENTITY_RELATION_INVALID');
});

test('plan label is constrained by an already resolved patient', () => {
  const { resolveEntities } = resolverModule();
  const result = resolveEntities(
    fixture(),
    invocation([
      { type: 'patient', id: 'patient-maria' },
      { type: 'plan', label: 'Rodilla inicial' },
    ]),
    context(),
  );
  assert.equal(result.status, 'resolved');
  assert.equal(result.entities.plan.id, 'plan-maria');
});

test('fuzzy partial labels never resolve and missing references clarify', () => {
  const { resolveEntities } = resolverModule();
  const fuzzy = resolveEntities(fixture(), invocation([{ type: 'patient', label: 'Mar' }]), context());
  assert.equal(fuzzy.status, 'clarification');
  assert.equal(fuzzy.clarification.code, 'ENTITY_NOT_FOUND');

  const missing = resolveEntities(fixture(), invocation([{ type: 'session' }]), context());
  assert.equal(missing.status, 'clarification');
  assert.equal(missing.clarification.code, 'ENTITY_NOT_FOUND');
});

test('resolver is side-effect free for a deeply frozen snapshot', () => {
  const { resolveEntities } = resolverModule();
  const state = freezeDeep(fixture());
  const before = JSON.stringify(state);
  const result = resolveEntities(state, invocation([{ type: 'clinical-record', id: 'record-jose' }]), context());
  assert.equal(result.status, 'resolved');
  assert.equal(result.entities.clinicalRecord.id, 'record-jose');
  assert.equal(JSON.stringify(state), before);
});
