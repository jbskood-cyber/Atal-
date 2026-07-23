import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const catalog = loadCore('src/features/atal-ai/core/audit/capabilityCatalog.js');

test('capability audit validation rejects duplicate ids and missing evidence', () => {
  const base = {
    id: 'patient.create',
    domain: 'patients',
    label: 'Crear paciente',
    route: '/patients/new',
    manualEntryPoint: 'src/data/atalStore.ts#createPatientWithRecord',
    canonicalPersistence: ['patients', 'clinicalRecords'],
    currentTests: ['tests/foundation.test.mjs'],
    readTools: [],
    actionTools: ['patient.create'],
    coverage: 'covered',
    risk: 'reversible-write',
    confirmation: 'explicit-request',
    audit: 'transaction-event',
    undo: 'validated-receipt',
    multimodal: ['text', 'audio', 'image', 'pdf'],
    gap: '',
    disposition: 'keep',
  };

  assert.throws(
    () => catalog.validateCapabilityAudit([base, { ...base }]),
    /Duplicate capability id: patient\.create/,
  );
  assert.throws(
    () => catalog.validateCapabilityAudit([{ ...base, currentTests: [] }]),
    /Capability patient\.create has no test evidence/,
  );
});

test('capability audit summary separates total and approved parity', () => {
  const rows = ['covered', 'partial', 'missing', 'excluded'].map((coverage, index) => ({
    id: `capability.${index}`,
    domain: 'patients',
    label: `Capability ${index}`,
    route: '/patients',
    manualEntryPoint: 'src/data/atalStore.ts#getAtalState',
    canonicalPersistence: ['patients'],
    currentTests: ['tests/foundation.test.mjs'],
    readTools: [],
    actionTools: [],
    coverage,
    risk: 'read',
    confirmation: 'none',
    audit: 'none',
    undo: 'not-applicable',
    multimodal: ['text'],
    gap: coverage === 'covered' ? '' : 'Known audit disposition.',
    disposition: coverage === 'excluded' ? 'exclude' : coverage === 'covered' ? 'keep' : 'build',
  }));

  assert.deepEqual(catalog.summarizeCapabilityAudit(rows), {
    total: 4,
    approvedTotal: 3,
    covered: 1,
    partial: 1,
    missing: 1,
    excluded: 1,
    parityPercent: 25,
    approvedParityPercent: 33,
  });
});

const manual = loadCore('src/features/atal-ai/core/audit/manualCapabilityInventory.js');

test('manual capability inventory covers all product domains and protected flows', () => {
  const ids = new Set(manual.manualCapabilityInventory.map((item) => item.id));
  const domains = new Set(manual.manualCapabilityInventory.map((item) => item.domain));
  assert.equal(domains.size, 9);
  for (const id of [
    'patient.create',
    'patient.update-contact',
    'clinical-record.update',
    'plan.replace-active',
    'plan.reorder-exercises',
    'exercise.update-media',
    'session.complete',
    'report.review',
    'delivery.generate-pdf',
    'settings.update-ai-preferences',
    'navigation.open-contextual-assistant',
  ]) assert.equal(ids.has(id), true, `Missing manual capability ${id}`);
  assert.equal(manual.manualCapabilityInventory.length, 62);
});

const audit = loadCore('src/features/atal-ai/core/audit/buildCapabilityAudit.js');

test('final audit maps universal tools to all approved capability groups', () => {
  const rows = audit.buildCapabilityAudit();
  const byId = new Map(rows.map((row) => [row.id, row]));
  assert.deepEqual(byId.get('patient.update-contact').actionTools, ['patient.update']);
  assert.deepEqual(byId.get('clinical-record.read-history').readTools, ['app.read']);
  assert.deepEqual(byId.get('plan.reorder-exercises').actionTools, ['plan.membership']);
  assert.deepEqual(byId.get('exercise.update-media').actionTools, ['exercise.media']);
  assert.deepEqual(byId.get('session.complete').actionTools, ['session.complete']);
  assert.deepEqual(byId.get('delivery.generate-pdf').actionTools, ['delivery.action']);
  assert.deepEqual(byId.get('report.review').actionTools, ['report.review']);
  assert.deepEqual(byId.get('navigation.open-screen').readTools, ['navigation.open']);
  assert.equal(byId.get('patient-note.delete').coverage, 'excluded');
});

test('every declared AI tool exists in the current registry', () => {
  const execution = loadCore('src/features/atal-ai/core/executionEngine.js');
  const registered = new Set(execution.atalAIToolRegistry.list().map((tool) => tool.name));
  for (const row of audit.buildCapabilityAudit()) {
    for (const tool of [...row.readTools, ...row.actionTools]) {
      assert.equal(registered.has(tool), true, `${row.id} references unregistered tool ${tool}`);
    }
  }
});

test('every approved capability is covered and exclusions remain explicit', () => {
  const rows = audit.buildCapabilityAudit();
  const summary = catalog.summarizeCapabilityAudit(rows);
  assert.equal(summary.total, 62);
  assert.equal(summary.approvedTotal, 57);
  assert.equal(summary.covered, 57);
  assert.equal(summary.partial, 0);
  assert.equal(summary.missing, 0);
  assert.equal(summary.excluded, 5);
  assert.equal(summary.approvedParityPercent, 100);
  assert.equal(summary.parityPercent, 92);
  assert.ok(rows.every((row) => row.coverage === 'covered' || row.coverage === 'excluded'));
});

test('every non-covered capability has an exclusion disposition', () => {
  for (const row of audit.buildCapabilityAudit()) {
    if (row.coverage === 'covered') assert.equal(row.disposition, 'keep');
    else assert.equal(row.disposition, 'exclude');
  }
});
