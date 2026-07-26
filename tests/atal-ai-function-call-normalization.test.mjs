import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const normalization = () => loadCore('src/features/atal-ai/core/agentic/functionCallNormalization.js');

const allowedReads = ['atal_app_read', 'atal_patient_search'];

test('maps get_patients hallucination to canonical app.read patients when that read is allowed', () => {
  const result = normalization().normalizeAgentFunctionCall({ name: 'get_patients', args: {} }, allowedReads);
  assert.deepEqual(result, { name: 'atal_app_read', args: { resource: 'patients' } });
});

test('maps patient.list hallucination to canonical app.read patients when that read is allowed', () => {
  const result = normalization().normalizeAgentFunctionCall({ name: 'patient.list', args: {} }, allowedReads);
  assert.deepEqual(result, { name: 'atal_app_read', args: { resource: 'patients' } });
});

test('does not normalize a safe read alias when app.read is not allowed for the turn', () => {
  const result = normalization().normalizeAgentFunctionCall({ name: 'get_patients', args: {} }, ['atal_patient_search']);
  assert.deepEqual(result, { name: 'get_patients', args: {} });
});

test('never aliases an unknown mutation-like function name', () => {
  const result = normalization().normalizeAgentFunctionCall({ name: 'delete_patient', args: { id: 'patient-e2e' } }, allowedReads);
  assert.deepEqual(result, { name: 'delete_patient', args: { id: 'patient-e2e' } });
});

test('keeps declared function names and arguments unchanged', () => {
  const call = { name: 'atal_app_read', args: { resource: 'patients', limit: 5 } };
  assert.deepEqual(normalization().normalizeAgentFunctionCall(call, allowedReads), call);
});
