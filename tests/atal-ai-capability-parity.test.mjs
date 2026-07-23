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
    actionTools: ['patient.create_with_record_and_plan'],
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

test('capability audit summary counts every coverage class', () => {
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
    covered: 1,
    partial: 1,
    missing: 1,
    excluded: 1,
    parityPercent: 25,
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

  assert.ok(manual.manualCapabilityInventory.length >= 50);
});
