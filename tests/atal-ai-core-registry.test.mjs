import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const registryModule = () => loadCore('src/features/atal-ai/core/toolRegistry.js');

function definition(name, patch = {}) {
  return {
    name,
    version: 1,
    risk: 'reversible-write',
    mutates: true,
    supportsUndo: true,
    undoTtlMs: 30_000,
    requiredEntities: [],
    validateInput: (input) => input,
    preconditions() {},
    execute() {
      return { status: 'success', message: 'ok', summary: [], affected: [] };
    },
    ...patch,
  };
}

test('registry rejects duplicate stable names', () => {
  const { createToolRegistry } = registryModule();
  assert.throws(
    () => createToolRegistry([definition('plan.pause'), definition('plan.pause')]),
    /duplicate/i,
  );
});

test('registry rejects invalid definition capabilities', () => {
  const { createToolRegistry } = registryModule();
  assert.throws(
    () => createToolRegistry([definition('bad.read', { risk: 'read', mutates: true })]),
    /read/i,
  );
  assert.throws(
    () => createToolRegistry([definition('bad.undo', { risk: 'read', mutates: false, supportsUndo: true })]),
    /undo/i,
  );
  assert.throws(
    () => createToolRegistry([definition('bad.ttl', { supportsUndo: false, undoTtlMs: 30_000 })]),
    /ttl/i,
  );
});

test('registry rejects unstable names and versions', () => {
  const { createToolRegistry } = registryModule();
  assert.throws(() => createToolRegistry([definition('Plan Pause')]), /name/i);
  assert.throws(() => createToolRegistry([definition('plan.pause', { version: 2 })]), /version/i);
});

test('registry lists definitions deterministically and rejects unknown lookup', () => {
  const { createToolRegistry } = registryModule();
  const registry = createToolRegistry([definition('plan.pause'), definition('patient_note.add')]);
  assert.deepEqual(registry.list().map((entry) => entry.name), ['patient_note.add', 'plan.pause']);
  assert.equal(registry.get('plan.pause').name, 'plan.pause');
  assert.throws(
    () => registry.get('unknown.tool'),
    (error) => error?.code === 'CORE_TOOL_UNKNOWN',
  );
});
