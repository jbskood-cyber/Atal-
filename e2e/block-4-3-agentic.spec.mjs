import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  createState,
  readStore,
  seedBrowser,
} from './fixtures.mjs';

async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: '¿Qué necesitas resolver?' })).toBeVisible();
}

function modelContent(id, bridge) {
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

test.describe('Block 4.3 universal agent', () => {
  test('explicit reversible note executes immediately and returns a grounded result', async ({ page }) => {
    await openAssistant(page);
    await mockAgent(page, [
      {
        text: '',
        modelContent: modelContent('call-note', 'atal_action'),
        calls: [{
          id: 'call-note',
          bridge: 'atal_action',
          tool: 'patient_note.add',
          input: { patient: { type: 'patient', id: 'patient-e2e' }, content: 'Nota agentiva E2E.' },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Añadí la nota al expediente del paciente.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.getByLabel('Mensaje para Atal IA').fill('Añade una nota al paciente E2E.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByText('Listo. Añadí la nota al expediente del paciente.')).toBeVisible();

    const store = await readStore(page);
    expect(store.notes).toHaveLength(1);
    expect(store.notes[0].content).toBe('Nota agentiva E2E.');
    expect(store.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'success')).toBe(true);
    await expect(page.getByRole('button', { name: 'Deshacer último cambio' })).toBeVisible();
  });

  test('multi-step request preserves safe work and pauses only before patient archival', async ({ page }) => {
    await openAssistant(page);
    await mockAgent(page, [
      {
        text: '',
        modelContent: { role: 'model', parts: [] },
        calls: [
          {
            id: 'call-safe-note', bridge: 'atal_action', tool: 'patient_note.add',
            input: { patient: { type: 'patient', id: 'patient-e2e' }, content: 'Nota antes del archivo.' },
            references: [{ type: 'patient', id: 'patient-e2e' }],
          },
          {
            id: 'call-sensitive-archive', bridge: 'atal_action', tool: 'patient.lifecycle',
            input: { patient: { type: 'patient', id: 'patient-e2e' }, archived: true },
            references: [{ type: 'patient', id: 'patient-e2e' }],
          },
        ],
      },
      {
        text: 'Listo. Conservé la nota y archivé al paciente después de tu confirmación.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.getByLabel('Mensaje para Atal IA').fill('Añade esta nota y archiva al paciente.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();
    let store = await readStore(page);
    expect(store.notes).toHaveLength(1);
    expect(store.patients.find((patient) => patient.id === 'patient-e2e').status).not.toBe('archived');

    const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CONVERSATIONS_KEY);
    expect(persisted[0].agentTask.status).toBe('needs-confirmation');
    expect(persisted[0].agentTask.pendingInvocation.tool).toBe('patient.lifecycle');

    await page.reload();
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText(/archivé al paciente después de tu confirmación/)).toBeVisible();
    store = await readStore(page);
    expect(store.patients.find((patient) => patient.id === 'patient-e2e').status).toBe('archived');
  });

  test('file-derived clinical update stops at compact review and preserves the artifact reference', async ({ page }) => {
    await openAssistant(page);
    await mockAgent(page, [{
      text: '',
      modelContent: modelContent('call-file-update', 'atal_action'),
      calls: [{
        id: 'call-file-update', bridge: 'atal_action', tool: 'patient.update',
        input: { patient: { type: 'patient', id: 'patient-e2e' }, patch: { diagnosis: 'Dato obtenido de imagen' } },
        references: [{ type: 'patient', id: 'patient-e2e' }],
      }],
    }]);

    const fileChooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Adjuntar' }).click();
    await page.getByText('Fotos').click();
    const chooser = await fileChooser;
    await chooser.setFiles({ name: 'indicacion.png', mimeType: 'image/png', buffer: Buffer.from('imagen-e2e') });
    await page.getByLabel('Mensaje para Atal IA').fill('Actualiza el diagnóstico usando esta imagen.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByText('Revisa antes de guardar')).toBeVisible();
    const store = await readStore(page);
    expect(store.patients.find((patient) => patient.id === 'patient-e2e').diagnosis).not.toBe('Dato obtenido de imagen');
  });
});
