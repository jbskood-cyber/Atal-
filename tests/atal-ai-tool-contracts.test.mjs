import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const catalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');

test('every agent tool has a unique direct function name and concrete input schema', () => {
  const entries = catalog().agentToolCatalog;
  const names = entries.map((entry) => entry.functionName);
  assert.equal(new Set(names).size, names.length);
  for (const entry of entries) {
    assert.match(entry.functionName, /^atal_[a-z0-9_]+$/);
    assert.equal(entry.inputSchema.type, 'object');
    assert.equal(typeof entry.inputSchema.properties, 'object');
  }
});

test('app.read exposes the exact supported resources instead of a generic object', () => {
  const entry = catalog().agentToolCatalogByName.get('app.read');
  assert.deepEqual(entry.inputSchema.properties.resource.enum, [
    'patient_profile',
    'clinical_record',
    'clinical_record_versions',
    'plans',
    'plan',
    'exercises',
    'exercise',
    'session_preparation',
    'sessions',
    'report',
    'activity',
    'settings',
    'delivery',
  ]);
  assert.deepEqual(entry.inputSchema.required, ['resource']);
});

test('common mutations declare the fields their validators require', () => {
  const patientUpdate = catalog().agentToolCatalogByName.get('patient.update');
  assert.deepEqual(patientUpdate.inputSchema.required, ['patient', 'patch']);
  const note = catalog().agentToolCatalogByName.get('patient_note.add');
  assert.deepEqual(note.inputSchema.required, ['patient', 'content']);
  const membership = catalog().agentToolCatalogByName.get('plan.membership');
  assert.deepEqual(membership.inputSchema.required, ['plan', 'operation', 'exerciseIds']);
});
