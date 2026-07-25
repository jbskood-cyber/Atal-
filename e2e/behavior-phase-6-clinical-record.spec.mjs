import { expect, test } from '@playwright/test';
import { createConversation, createState, readStore, seedBrowser } from './fixtures.mjs';

async function sendMessage(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

function agentModelContent(id, bridge) {
  return { role: 'model', parts: [{ functionCall: { id, name: bridge, args: {} } }] };
}

async function mockAgent(page, turns) {
  let index = 0;
  await page.route('**/api/atal-ai/agent-turn', async (route) => {
    const turn = turns[Math.min(index, turns.length - 1)];
    index += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(turn) });
  });
}

test.describe('Behavior System Phase 6 — clinical record browser parity', () => {
  test('Atal IA upserts the selected clinical record with version snapshot and audited transaction', async ({ page }) => {
    const state = createState();
    const original = state.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
    expect(original).toBeTruthy();
    const originalDate = original.date;
    const originalVersion = original.version;
    const originalNotes = original.clinicalNotes;

    const conversation = createConversation({
      intent: 'update_clinical_record',
      selectedPatientId: 'patient-e2e',
    });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('update-record', 'atal_action'),
        calls: [{
          id: 'update-record',
          bridge: 'atal_action',
          tool: 'clinical_record.upsert',
          input: {
            patient: { type: 'patient', id: 'patient-e2e' },
            patch: {
              clinicalNotes: 'Seguimiento clínico actualizado por IA E2E',
              painLevel: 3,
              goals: ['Recuperar elevación activa sin dolor'],
            },
          },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Actualicé y versioné el expediente clínico.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Actualiza el expediente del paciente seleccionado con el seguimiento de hoy.');
    await expect(page.getByText('Listo. Actualicé y versioné el expediente clínico.')).toBeVisible();

    const after = await readStore(page);
    const record = after.clinicalRecords.find((item) => item.id === original.id);
    expect(record).toBeTruthy();
    expect(record.version).toBe(originalVersion + 1);
    expect(record.date).toBe(originalDate);
    expect(record.clinicalNotes).toBe('Seguimiento clínico actualizado por IA E2E');
    expect(record.painLevel).toBe(3);
    expect(record.goals).toEqual(['Recuperar elevación activa sin dolor']);

    const versions = after.clinicalRecordVersions.filter((item) => item.recordId === original.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(originalVersion);
    expect(versions[0].snapshot.clinicalNotes).toBe(originalNotes);

    const audit = after.events.find((event) => event.toolName === 'clinical_record.upsert' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.transactionId).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.affectedEntities).toEqual([{ type: 'clinical-record', id: original.id }]);
  });
});
