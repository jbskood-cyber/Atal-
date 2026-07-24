import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const patientActions = () => loadCore('src/domain/actions/patientActions.js');
const recordActions = () => loadCore('src/domain/actions/clinicalRecordActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{
      id: 'patient-1',
      name: 'José Pérez',
      diagnosis: 'Dolor de rodilla',
      age: 32,
      birthDate: '',
      sex: '',
      affectedArea: 'Rodilla',
      status: 'active',
      visitType: 'followup',
      contact: { phone: '111', email: 'old@example.com', address: '', emergencyContact: '' },
      createdAt,
      updatedAt: createdAt,
    }, {
      id: 'patient-2',
      name: 'Ana Ruiz',
      diagnosis: 'Dolor lumbar',
      age: 40,
      birthDate: '',
      sex: '',
      affectedArea: 'Lumbar',
      status: 'active',
      visitType: 'first',
      contact: { phone: '', email: '', address: '', emergencyContact: '' },
      createdAt,
      updatedAt: createdAt,
    }],
    plans: [{
      id: 'plan-1',
      patientId: 'patient-1',
      title: 'Plan de rodilla',
      focus: 'Movilidad',
      duration: '4 semanas',
      frequency: '3 días',
      goal: 'Recuperar función',
      exerciseIds: ['exercise-1'],
      status: 'active',
      progression: '',
      reportCriteria: '',
      generalInstructions: '',
      createdAt,
      updatedAt: createdAt,
    }, {
      id: 'plan-2',
      patientId: 'patient-2',
      title: 'Plan lumbar',
      focus: 'Control motor',
      duration: '4 semanas',
      frequency: '3 días',
      goal: 'Mejorar tolerancia',
      exerciseIds: ['exercise-1'],
      status: 'active',
      progression: '',
      reportCriteria: '',
      generalInstructions: '',
      createdAt,
      updatedAt: createdAt,
    }],
    exercises: [{
      id: 'exercise-1', name: 'Movilidad', region: 'Rodilla', category: 'Movilidad', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: 'Inicial', sets: 3, repetitions: 10, rest: '', maxPain: 3, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt, updatedAt: createdAt,
    }],
    clinicalRecords: [],
    clinicalRecordVersions: [],
    sessions: [],
    notes: [],
    events: [],
    notifications: [],
    settings: {
      notifications: true, haptics: true, compact: true, professionalName: 'Fisio prueba', specialty: 'Fisioterapia', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '',
    },
    feedback: [],
  };
}

function idFactory(...ids) {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
}

test('canonical patient creation rejects normalized duplicate names', () => {
  const state = baseState();
  const { applyCreatePatient } = patientActions();
  assert.throws(() => applyCreatePatient(state, {
    patientId: 'patient-new',
    now: '2026-07-24T12:00:00.000Z',
    createEventId: idFactory('event-1'),
    patient: {
      name: '  jose   perez ', diagnosis: 'Otro motivo', age: null, birthDate: '', sex: '', affectedArea: '', status: 'active', visitType: 'first', contact: { phone: '', email: '', address: '', emergencyContact: '' },
    },
  }), /ya existe el paciente/i);
  assert.equal(state.patients.length, 2);
  assert.equal(state.events.length, 0);
});

test('canonical patient creation creates one patient and one clinical event', () => {
  const state = baseState();
  const { applyCreatePatient } = patientActions();
  const result = applyCreatePatient(state, {
    patientId: 'patient-3',
    now: '2026-07-24T12:00:00.000Z',
    createEventId: idFactory('event-create'),
    patient: {
      name: '  Carlos Vega  ', diagnosis: '  Dolor de hombro  ', age: 28, birthDate: '', sex: '', affectedArea: 'Hombro', status: 'active', visitType: 'first', contact: { phone: '', email: '', address: '', emergencyContact: '' },
    },
  });
  assert.equal(result.patient.id, 'patient-3');
  assert.equal(result.patient.name, 'Carlos Vega');
  assert.equal(result.patient.diagnosis, 'Dolor de hombro');
  assert.equal(result.patient.createdAt, '2026-07-24T12:00:00.000Z');
  assert.equal(result.patient.updatedAt, '2026-07-24T12:00:00.000Z');
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].kind, 'patient_created');
  assert.equal(state.events[0].patientId, 'patient-3');
});

test('canonical patient update preserves identity and merges contact', () => {
  const state = baseState();
  const { applyUpdatePatient } = patientActions();
  const result = applyUpdatePatient(state, {
    patientId: 'patient-1',
    now: '2026-07-24T12:30:00.000Z',
    createEventId: idFactory('event-update'),
    patch: { diagnosis: 'Síndrome femoropatelar', contact: { email: 'new@example.com' } },
  });
  assert.equal(result.patient.id, 'patient-1');
  assert.equal(result.patient.createdAt, '2026-07-24T10:00:00.000Z');
  assert.equal(result.patient.updatedAt, '2026-07-24T12:30:00.000Z');
  assert.equal(result.patient.contact.phone, '111');
  assert.equal(result.patient.contact.email, 'new@example.com');
  assert.equal(state.events[0].kind, 'patient_updated');
});

test('canonical patient rename rejects a duplicate normalized name', () => {
  const state = baseState();
  const { applyUpdatePatient } = patientActions();
  assert.throws(() => applyUpdatePatient(state, {
    patientId: 'patient-2',
    now: '2026-07-24T12:30:00.000Z',
    createEventId: idFactory('event-update'),
    patch: { name: ' JOSE PÉREZ ' },
  }), /ya existe el paciente/i);
  assert.equal(state.patients[1].name, 'Ana Ruiz');
  assert.equal(state.events.length, 0);
});

test('canonical clinical record creation uses version 1 and validates plan ownership', () => {
  const state = baseState();
  const { applyUpsertClinicalRecord } = recordActions();
  const result = applyUpsertClinicalRecord(state, {
    patientId: 'patient-1',
    now: '2026-07-24T13:00:00.000Z',
    recordId: 'record-1',
    versionId: 'unused-version',
    createEventId: idFactory('event-record-create'),
    patch: {
      date: '2026-07-20T09:00:00.000Z',
      reasonForVisit: 'Dolor al subir escaleras',
      planId: 'plan-1',
      painLevel: 5,
    },
  });
  assert.equal(result.record.version, 1);
  assert.equal(result.record.patientId, 'patient-1');
  assert.equal(result.record.date, '2026-07-20T09:00:00.000Z');
  assert.equal(result.record.professional, 'Fisio prueba');
  assert.equal(result.record.createdAt, '2026-07-24T13:00:00.000Z');
  assert.equal(state.clinicalRecordVersions.length, 0);
  assert.equal(state.events[0].kind, 'record_created');

  const invalid = baseState();
  assert.throws(() => applyUpsertClinicalRecord(invalid, {
    patientId: 'patient-1',
    now: '2026-07-24T13:00:00.000Z',
    recordId: 'record-invalid',
    versionId: 'unused-version',
    createEventId: idFactory('event-invalid'),
    patch: { reasonForVisit: 'Dolor', planId: 'plan-2' },
  }), /no pertenece al paciente/i);
  assert.equal(invalid.clinicalRecords.length, 0);
  assert.equal(invalid.events.length, 0);
});

test('canonical clinical record update creates exactly one snapshot and preserves record date', () => {
  const state = baseState();
  state.clinicalRecords.push({
    id: 'record-1', patientId: 'patient-1', version: 1, date: '2026-07-20T09:00:00.000Z', reasonForVisit: 'Dolor inicial', evolution: '', affectedArea: 'Rodilla', symptoms: [], painLevel: 5, providedDiagnosis: '', functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: 'plan-1', professional: 'Fisio prueba', createdAt: '2026-07-20T09:00:00.000Z', updatedAt: '2026-07-20T09:00:00.000Z',
  });
  const before = structuredClone(state.clinicalRecords[0]);
  const { applyUpsertClinicalRecord } = recordActions();
  const result = applyUpsertClinicalRecord(state, {
    patientId: 'patient-1',
    now: '2026-07-24T14:00:00.000Z',
    recordId: 'unused-record',
    versionId: 'record-version-1',
    createEventId: idFactory('event-record-update'),
    patch: { clinicalNotes: 'Mejor tolerancia', painLevel: 3 },
  });
  assert.equal(result.record.id, 'record-1');
  assert.equal(result.record.patientId, 'patient-1');
  assert.equal(result.record.version, 2);
  assert.equal(result.record.createdAt, before.createdAt);
  assert.equal(result.record.date, before.date);
  assert.equal(result.record.updatedAt, '2026-07-24T14:00:00.000Z');
  assert.equal(state.clinicalRecordVersions.length, 1);
  assert.equal(state.clinicalRecordVersions[0].id, 'record-version-1');
  assert.equal(state.clinicalRecordVersions[0].version, 1);
  assert.deepEqual(state.clinicalRecordVersions[0].snapshot, before);
  assert.equal(state.events[0].kind, 'record_updated');
  assert.match(state.events[0].detail, /Versión 2/);
});
