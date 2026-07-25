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

test.describe('Behavior System Phase 6 — plan runtime parity', () => {
  test('Atal IA updates plan fields through the canonical reversible-write path', async ({ page }) => {
    const state = createState();
    const conversation = createConversation({
      intent: 'update_plan',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-active-e2e',
    });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('update-plan', 'atal_action'),
        calls: [{
          id: 'update-plan',
          bridge: 'atal_action',
          tool: 'plan.update_fields',
          input: {
            plan: { type: 'plan', id: 'plan-active-e2e' },
            patch: { frequency: '4 veces por semana' },
          },
          references: [{ type: 'plan', id: 'plan-active-e2e' }],
        }],
      },
      {
        text: 'Listo. Actualicé la frecuencia del plan.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Cambia la frecuencia del plan activo a 4 veces por semana.');
    await expect(page.getByText('Listo. Actualicé la frecuencia del plan.')).toBeVisible();

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.id === 'plan-active-e2e');
    expect(plan.frequency).toBe('4 veces por semana');
    const audit = after.events.find((event) => event.toolName === 'plan.update_fields' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
    expect(audit.affectedEntities).toEqual([{ type: 'plan', id: 'plan-active-e2e' }]);
  });

  test('direct UI pauses an active plan through the canonical lifecycle semantics', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/plans/plan-active-e2e');

    await page.getByRole('button', { name: 'Acciones del plan' }).click();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await expect(page.getByRole('status')).toHaveText('Estado actualizado');

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.id === 'plan-active-e2e');
    expect(plan.status).toBe('paused');
    expect(after.events.some((event) => event.planId === 'plan-active-e2e' && /paus/i.test(`${event.title} ${event.detail}`))).toBe(true);
  });

  test('Atal IA adds an exercise to a plan through canonical membership and audits the write', async ({ page }) => {
    const state = createState();
    const extra = {
      ...state.exercises[0],
      id: 'exercise-extra-e2e',
      name: 'Control escapular E2E',
    };
    state.exercises.push(extra);
    const conversation = createConversation({
      intent: 'update_plan',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-active-e2e',
      selectedExerciseId: 'exercise-extra-e2e',
    });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('add-exercise', 'atal_action'),
        calls: [{
          id: 'add-exercise',
          bridge: 'atal_action',
          tool: 'plan.membership',
          input: {
            plan: { type: 'plan', id: 'plan-active-e2e' },
            operation: 'add',
            exerciseIds: ['exercise-extra-e2e'],
          },
          references: [
            { type: 'plan', id: 'plan-active-e2e' },
            { type: 'exercise', id: 'exercise-extra-e2e' },
          ],
        }],
      },
      {
        text: 'Listo. Añadí el ejercicio al plan.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Añade Control escapular E2E al plan activo.');
    await expect(page.getByText('Listo. Añadí el ejercicio al plan.')).toBeVisible();

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.id === 'plan-active-e2e');
    expect(plan.exerciseIds).toContain('exercise-e2e');
    expect(plan.exerciseIds).toContain('exercise-extra-e2e');
    const audit = after.events.find((event) => event.toolName === 'plan.membership' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
  });
});
