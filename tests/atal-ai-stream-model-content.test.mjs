import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const streamModule = () => loadCore('src/features/atal-ai/core/agentic/streamModelContent.js');

test('streamed Gemini function calls preserve provider thoughtSignature in model history', () => {
  const { createStreamModelContentCollector } = streamModule();
  const collector = createStreamModelContentCollector();

  collector.addContent({
    role: 'model',
    parts: [{ functionCall: { id: 'call-1', name: 'atal_patient_create', args: { patient: { name: 'Nicolás' } } } }],
  });
  collector.addContent({
    role: 'model',
    parts: [{
      functionCall: { id: 'call-1', name: 'atal_patient_create', args: { patient: { name: 'Nicolás' } } },
      thoughtSignature: 'provider-signature-abc',
    }],
  });

  const content = collector.content();
  assert.equal(content?.role, 'model');
  assert.deepEqual(content?.parts, [{
    functionCall: { id: 'call-1', name: 'atal_patient_create', args: { patient: { name: 'Nicolás' } } },
    thoughtSignature: 'provider-signature-abc',
  }]);
});

test('streamed model history keeps text and parallel function calls in provider order without duplicating chunks', () => {
  const { createStreamModelContentCollector } = streamModule();
  const collector = createStreamModelContentCollector();

  collector.addContent({ role: 'model', parts: [{ text: 'Voy a guardar los cambios.' }] });
  collector.addContent({
    role: 'model',
    parts: [
      { functionCall: { id: 'call-a', name: 'atal_patient_update', args: { patient: { type: 'patient', id: 'p1' } } }, thoughtSignature: 'sig-a' },
      { functionCall: { id: 'call-b', name: 'atal_clinical_record_upsert', args: { patient: { type: 'patient', id: 'p1' } } } },
    ],
  });

  assert.deepEqual(collector.content()?.parts, [
    { text: 'Voy a guardar los cambios.' },
    { functionCall: { id: 'call-a', name: 'atal_patient_update', args: { patient: { type: 'patient', id: 'p1' } } }, thoughtSignature: 'sig-a' },
    { functionCall: { id: 'call-b', name: 'atal_clinical_record_upsert', args: { patient: { type: 'patient', id: 'p1' } } } },
  ]);
});
