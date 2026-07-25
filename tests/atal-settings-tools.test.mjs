import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const canonicalTools = () => loadCore('src/features/atal-ai/core/tools/canonicalSettingsTools.js');

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

function environment(state) {
  return {
    state,
    context: { now: '2026-07-24T12:00:00.000Z', conversationId: 'conversation-1', surface: 'general' },
    resolved: { settings: state.settings },
    transactionId: 'ai-transaction-settings',
  };
}

test('canonical settings tool bundle owns both preferences and professional profile writes', () => {
  const { canonicalSettingsTools, canonicalSettingsToolNames } = canonicalTools();
  const names = canonicalSettingsTools.map((tool) => tool.name).sort();
  assert.deepEqual(names, ['settings.profile_update', 'settings.update']);
  assert.equal(canonicalSettingsToolNames.has('settings.update'), true);
  assert.equal(canonicalSettingsToolNames.has('settings.profile_update'), true);
  for (const tool of canonicalSettingsTools) {
    assert.equal(tool.mutates, true);
    assert.equal(tool.supportsUndo, true);
    assert.deepEqual(tool.requiredEntities, ['settings']);
  }
});

test('canonical settings.update delegates preference semantics to the shared domain action', () => {
  const state = baseState();
  const { canonicalSettingsTools } = canonicalTools();
  const tool = canonicalSettingsTools.find((item) => item.name === 'settings.update');
  assert.ok(tool);

  const input = tool.validateInput({ patch: { notifications: false, aiInstructions: '  Prioriza seguridad.  ' } });
  const result = tool.execute(environment(state), input);

  assert.equal(state.settings.notifications, false);
  assert.equal(state.settings.aiInstructions, 'Prioriza seguridad.');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.affected, [{ type: 'settings', id: 'settings' }]);
});

test('canonical settings.profile_update delegates profile normalization to the same domain action', () => {
  const state = baseState();
  const { canonicalSettingsTools } = canonicalTools();
  const tool = canonicalSettingsTools.find((item) => item.name === 'settings.profile_update');
  assert.ok(tool);

  const input = tool.validateInput({ profile: { professionalName: '  Dra. Ana  ', specialty: '  Deportiva ', clinic: '  Norte  ' } });
  const result = tool.execute(environment(state), input);

  assert.equal(state.settings.professionalName, 'Dra. Ana');
  assert.equal(state.settings.specialty, 'Deportiva');
  assert.equal(state.settings.clinic, 'Norte');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.affected, [{ type: 'settings', id: 'settings' }]);
});

test('settings.profile_update accepts the public Gemini catalog shape', () => {
  const state = baseState();
  const { canonicalSettingsTools } = canonicalTools();
  const tool = canonicalSettingsTools.find((item) => item.name === 'settings.profile_update');
  assert.ok(tool);

  const input = tool.validateInput({
    professionalName: '  Dra. Ana E2E  ',
    specialty: '  Fisioterapia deportiva  ',
    clinic: '  Norte E2E  ',
  });
  const result = tool.execute(environment(state), input);

  assert.equal(state.settings.professionalName, 'Dra. Ana E2E');
  assert.equal(state.settings.specialty, 'Fisioterapia deportiva');
  assert.equal(state.settings.clinic, 'Norte E2E');
  assert.equal(result.status, 'success');
});
