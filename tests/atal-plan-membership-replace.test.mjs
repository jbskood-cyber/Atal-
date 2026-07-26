import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const canonicalPlanTools = () => loadCore('src/features/atal-ai/core/tools/canonicalPlanTools.js');
const toolCatalog = () => loadCore('src/features/atal-ai/api/agentToolCatalog.js');

function baseState() {
  const now = '2026-07-26T17:30:00.000Z';
  return {
    version: 2,
    seededAt: now,
    updatedAt: now,
    patients: [{ id: 'patient-1', name: 'Paciente QA', diagnosis: '', age: 30, birthDate: '', sex: '', affectedArea: '', status: 'active', visitType: 'followup', contact: { phone: '', email: '', address: '', emergencyContact: '' }, createdAt: now, updatedAt: now }],
    plans: [{ id: 'plan-1', patientId: 'patient-1', title: 'Plan QA', focus: '', duration: '6 semanas', frequency: '3 veces por semana', goal: '', exerciseIds: ['exercise-a', 'exercise-b'], status: 'active', progression: '', reportCriteria: '', generalInstructions: '', createdAt: now, updatedAt: now }],
    exercises: [
      { id: 'exercise-a', name: 'Movilidad asistida QA', region: 'Hombro', category: 'Movilidad', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: '', sets: 3, repetitions: 10, rest: '', maxPain: null, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt: now, updatedAt: now },
      { id: 'exercise-b', name: 'Control escapular QA', region: 'Hombro', category: 'Control', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: '', sets: 3, repetitions: 12, rest: '', maxPain: null, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt: now, updatedAt: now },
      { id: 'exercise-c', name: 'Rotación externa QA', region: 'Hombro', category: 'Fuerza', objective: '', startingPosition: '', instructions: [], precautions: '', equipment: '', difficulty: '', sets: 3, repetitions: 10, rest: '', maxPain: null, tags: [], notes: '', media: { type: 'none' }, status: 'active', source: 'local', createdAt: now, updatedAt: now },
    ],
    clinicalRecords: [], clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [],
    settings: { notifications: true, haptics: true, compact: true, professionalName: '', specialty: '', clinic: '', sessionLock: true, clinicalPrivacy: true, aiSuggestions: true, aiAlerts: true, aiInstructions: '' },
    feedback: [],
  };
}

test('canonical membership supports atomic exercise replacement without abusing reorder semantics', () => {
  const state = baseState();
  const { canonicalPlanTools: tools } = canonicalPlanTools();
  const membershipTool = tools.find((tool) => tool.name === 'plan.membership');
  assert.ok(membershipTool);
  const input = membershipTool.validateInput({
    plan: { type: 'plan', id: 'plan-1' },
    operation: 'replace',
    exerciseIds: ['exercise-a', 'exercise-c'],
  });
  const result = membershipTool.execute({
    state,
    resolved: { plan: state.plans[0] },
    transactionId: 'tx-replace',
    context: { now: '2026-07-26T17:31:00.000Z' },
  }, input);

  assert.deepEqual(result.data.exerciseIds, ['exercise-a', 'exercise-c']);
  assert.deepEqual(state.plans[0].exerciseIds, ['exercise-a', 'exercise-c']);
  assert.equal(state.events[0].kind, 'plan_updated');
  assert.equal(state.events.length, 1);
});

test('plan.membership public contract exposes replace as a first-class operation', () => {
  const { agentToolCatalog } = toolCatalog();
  const catalogEntry = agentToolCatalog.find((entry) => entry.name === 'plan.membership');
  assert.ok(catalogEntry);
  assert.deepEqual(catalogEntry.inputSchema.properties.operation.enum, ['add', 'remove', 'reorder', 'replace']);
});
