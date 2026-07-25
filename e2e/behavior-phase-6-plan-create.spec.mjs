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

test.describe('Behavior System Phase 6 — plan creation parity', () => {
  test('direct UI creates a draft plan from the real builder and persists membership', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/plans/new');

    await page.getByLabel('Título del plan').fill('Plan UI Phase 6');
    await page.getByRole('button', { name: /Agregar ejercicios/ }).click();
    await page.getByRole('button', { name: /Movilidad asistida E2E/ }).click();
    await page.getByRole('button', { name: /Agregar al plan/ }).click();
    await page.getByRole('button', { name: /Crear borrador de plan/ }).click();

    await expect(page).toHaveURL(/\/plans\/[^/]+$/);
    const after = await readStore(page);
    const plan = after.plans.find((item) => item.title === 'Plan UI Phase 6');
    expect(plan).toBeTruthy();
    expect(plan.patientId).toBe('patient-e2e');
    expect(plan.status).toBe('draft');
    expect(plan.exerciseIds).toEqual(['exercise-e2e']);
  });

  test('Atal IA creates a plan through the canonical audited tool', async ({ page }) => {
    const conversation = createConversation({
      intent: 'create_patient_plan',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
    });
    await seedBrowser(page, { state: createState(), conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('create-plan', 'atal_action'),
        calls: [{
          id: 'create-plan',
          bridge: 'atal_action',
          tool: 'plan.create_simple',
          input: {
            patient: { type: 'patient', id: 'patient-e2e' },
            title: 'Plan IA Phase 6',
            focus: 'Control de hombro',
            duration: '5 semanas',
            frequency: '2 veces por semana',
            goal: 'Mejorar control funcional',
            exerciseIds: ['exercise-e2e'],
            status: 'draft',
            progression: 'Progresar según tolerancia',
            reportCriteria: 'Reportar dolor alto',
            generalInstructions: 'Movimiento controlado',
          },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Creé el plan.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Crea un plan nuevo para el paciente seleccionado.');
    await expect(page.getByText('Listo. Creé el plan.')).toBeVisible();

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.title === 'Plan IA Phase 6');
    expect(plan).toBeTruthy();
    expect(plan.patientId).toBe('patient-e2e');
    expect(plan.status).toBe('draft');
    expect(plan.exerciseIds).toEqual(['exercise-e2e']);
    const audit = after.events.find((event) => event.toolName === 'plan.create_simple' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
  });
});