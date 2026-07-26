import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const settingsActions = () => loadCore('src/domain/actions/settingsActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2, seededAt: createdAt, updatedAt: createdAt,
    patients: [], plans: [], exercises: [], clinicalRecords: [], clinicalRecordVersions: [], sessions: [], notes: [],
    events: [], notifications: [],
    settings: {
      notifications: true,
      haptics: true,
      compact: true,
      professionalName: 'Cuenta demo',
      specialty: 'Fisioterapeuta',
      clinic: '',
      sessionLock: true,
      clinicalPrivacy: true,
      aiSuggestions: true,
      aiAlerts: true,
      aiInstructions: 'Prioriza claridad.',
    },
    feedback: [],
  };
}

test('canonical settings update applies preference and profile fields through one domain action', () => {
  const state = baseState();
  const { applyUpdateSettings } = settingsActions();

  const result = applyUpdateSettings(state, {
    patch: {
      notifications: false,
      professionalName: '  Dra. Ana López  ',
      specialty: '  Fisioterapia deportiva ',
      clinic: '  Clínica Norte  ',
      aiInstructions: '  Sé breve y prioriza seguridad.  ',
    },
  });

  assert.equal(state.settings.notifications, false);
  assert.equal(state.settings.professionalName, 'Dra. Ana López');
  assert.equal(state.settings.specialty, 'Fisioterapia deportiva');
  assert.equal(state.settings.clinic, 'Clínica Norte');
  assert.equal(state.settings.aiInstructions, 'Sé breve y prioriza seguridad.');
  assert.equal(state.settings.haptics, true);
  assert.deepEqual(result.changedFields.sort(), ['aiInstructions', 'clinic', 'notifications', 'professionalName', 'specialty'].sort());
});

test('canonical settings update rejects unsupported fields and invalid value types without mutation', () => {
  const { applyUpdateSettings } = settingsActions();

  for (const patch of [
    {},
    { unknownSetting: true },
    { notifications: 'yes' },
    { professionalName: 42 },
    { professionalName: 'x'.repeat(181) },
    { specialty: 'x'.repeat(181) },
    { clinic: 'x'.repeat(301) },
  ]) {
    const state = baseState();
    const before = structuredClone(state);
    assert.throws(() => applyUpdateSettings(state, { patch }), /ajuste|valor|permit|180|300|cambio/i);
    assert.deepEqual(state, before);
  }
});

test('canonical settings update accepts every existing boolean preference and preserves unrelated fields', () => {
  const state = baseState();
  const { applyUpdateSettings } = settingsActions();

  applyUpdateSettings(state, {
    patch: {
      notifications: false,
      haptics: false,
      compact: false,
      sessionLock: false,
      clinicalPrivacy: false,
      aiSuggestions: false,
      aiAlerts: false,
    },
  });

  assert.equal(state.settings.notifications, false);
  assert.equal(state.settings.haptics, false);
  assert.equal(state.settings.compact, false);
  assert.equal(state.settings.sessionLock, false);
  assert.equal(state.settings.clinicalPrivacy, false);
  assert.equal(state.settings.aiSuggestions, false);
  assert.equal(state.settings.aiAlerts, false);
  assert.equal(state.settings.professionalName, 'Cuenta demo');
  assert.equal(state.settings.aiInstructions, 'Prioriza claridad.');
});
