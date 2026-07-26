import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const noteActions = () => loadCore('src/domain/actions/patientNoteActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2, seededAt: createdAt, updatedAt: createdAt,
    patients: [{ id: 'patient-1', name: 'Paciente', diagnosis: '', age: null, birthDate: '', sex: '', affectedArea: '', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt, updatedAt: createdAt }],
    plans: [], exercises: [], clinicalRecords: [], clinicalRecordVersions: [], sessions: [],
    notes: [{ id: 'note-1', patientId: 'patient-1', content: 'Original', professional: 'Fisio', createdAt, updatedAt: createdAt }],
    events: [], notifications: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: 'Fisio', specialty: 'Fisioterapia', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

test('canonical note update trims content and preserves immutable note identity', () => {
  const state = baseState();
  const { applyUpdatePatientNote } = noteActions();
  const original = structuredClone(state.notes[0]);

  const result = applyUpdatePatientNote(state, {
    noteId: 'note-1', patientId: 'patient-1', content: '  Evolución favorable.  ', now: '2026-07-24T12:00:00.000Z',
  });

  assert.equal(result.note.id, original.id);
  assert.equal(result.note.patientId, original.patientId);
  assert.equal(result.note.professional, original.professional);
  assert.equal(result.note.createdAt, original.createdAt);
  assert.equal(result.note.content, 'Evolución favorable.');
  assert.equal(result.note.updatedAt, '2026-07-24T12:00:00.000Z');
});

test('canonical note update rejects blank content and content over the UI limit without mutation', () => {
  const { applyUpdatePatientNote } = noteActions();

  for (const content of ['   ', 'x'.repeat(1001)]) {
    const state = baseState();
    const before = structuredClone(state);
    assert.throws(() => applyUpdatePatientNote(state, {
      noteId: 'note-1', patientId: 'patient-1', content, now: '2026-07-24T12:00:00.000Z',
    }), /nota|1000|contenido/i);
    assert.deepEqual(state, before);
  }
});

test('canonical note update enforces patient ownership and missing note safety', () => {
  const { applyUpdatePatientNote } = noteActions();
  const state = baseState();
  const before = structuredClone(state);

  assert.throws(() => applyUpdatePatientNote(state, {
    noteId: 'note-1', patientId: 'patient-2', content: 'Cambio', now: '2026-07-24T12:00:00.000Z',
  }), /no pertenece|nota/i);
  assert.deepEqual(state, before);

  assert.throws(() => applyUpdatePatientNote(state, {
    noteId: 'missing', patientId: 'patient-1', content: 'Cambio', now: '2026-07-24T12:00:00.000Z',
  }), /nota/i);
  assert.deepEqual(state, before);
});
