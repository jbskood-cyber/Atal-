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

function secondExercise(state) {
  return {
    ...structuredClone(state.exercises[0]),
    id: 'exercise-second-e2e',
    name: 'Control escapular E2E',
    category: 'Control motor',
    objective: 'Mejorar control escapular',
    createdAt: '2026-07-22T12:05:00.000Z',
    updatedAt: '2026-07-22T12:05:00.000Z',
  };
}

test.describe('Behavior System Phase 6 — plan browser parity', () => {
  test('manual UI creates a draft plan from the real builder and persists its exercise membership', async ({ page }) => {
    const state = createState();
    await seedBrowser(page, { state });

    await page.goto('/plans/new');
    await page.getByLabel('Título del plan').fill('Plan creado desde UI E2E');
    await page.getByRole('button', { name: /Agregar ejercicios/ }).click();
    await page.getByRole('button', { name: /Movilidad asistida E2E/ }).click();
    await page.getByRole('button', { name: /Agregar al plan/ }).click();
    await page.getByRole('button', { name: /Crear borrador de plan/ }).click();

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.title === 'Plan creado desde UI E2E');
    expect(plan).toBeTruthy();
    expect(plan.patientId).toBe('patient-e2e');
    expect(plan.status).toBe('draft');
    expect(plan.exerciseIds).toEqual(['exercise-e2e']);
    expect(after.events.some((event) => event.type === 'plan_created' && event.planId === plan.id)).toBe(true);
  });

  test('Atal IA creates and then updates a plan through canonical audited tools', async ({ page }) => {
    const state = createState();
    const conversation = createConversation({ intent: 'create_plan', selectedPatientId: 'patient-e2e' });
    await seedBrowser(page, { state, conversations: [conversation] });
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
            title: 'Plan IA E2E',
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
        text: 'Plan creado.',
        modelContent: { role: 'model', parts: [{ text: 'Plan creado.' }] },
        calls: [],
      },
      {
        text: '',
        modelContent: agentModelContent('update-plan', 'atal_action'),
        calls: [{
          id: 'update-plan',
          bridge: 'atal_action',
          tool: 'plan.update_fields',
          input: {
            plan: { type: 'plan', label: 'Plan IA E2E' },
            patch: { frequency: '4 veces por semana', goal: 'Recuperar control completo' },
          },
          references: [{ type: 'plan', label: 'Plan IA E2E' }],
        }],
      },
      {
        text: 'Plan actualizado.',
        modelContent: { role: 'model', parts: [{ text: 'Plan actualizado.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Crea un plan nuevo para el paciente seleccionado.');
    await expect(page.getByText('Plan creado.')).toBeVisible();
    await sendMessage(page, 'Actualiza la frecuencia y el objetivo del plan que acabas de crear.');
    await expect(page.getByText('Plan actualizado.')).toBeVisible();

    const after = await readStore(page);
    const plan = after.plans.find((item) => item.title === 'Plan IA E2E');
    expect(plan).toBeTruthy();
    expect(plan.status).toBe('draft');
    expect(plan.exerciseIds).toEqual(['exercise-e2e']);
    expect(plan.frequency).toBe('4 veces por semana');
    expect(plan.goal).toBe('Recuperar control completo');

    const createAudit = after.events.find((event) => event.toolName === 'plan.create_simple' && event.outcome === 'success');
    const updateAudit = after.events.find((event) => event.toolName === 'plan.update_fields' && event.outcome === 'success');
    expect(createAudit?.transactionId).toBeTruthy();
    expect(updateAudit?.transactionId).toBeTruthy();
    expect(createAudit?.riskLevel).toBe('reversible-write');
    expect(updateAudit?.riskLevel).toBe('reversible-write');
  });

  test('manual UI activates the candidate plan and resolves an existing active-plan conflict', async ({ page }) => {
    const state = createState();
    await seedBrowser(page, { state });

    await page.goto('/plans/plan-draft-e2e');
    await page.getByLabel('Acciones del plan').click();
    await page.getByRole('button', { name: 'Activar' }).click();
    await expect(page.getByText('Ya existe un plan activo')).toBeVisible();
    await page.getByRole('button', { name: 'Pausar anterior' }).click();

    const after = await readStore(page);
    expect(after.plans.find((item) => item.id === 'plan-draft-e2e')?.status).toBe('active');
    expect(after.plans.find((item) => item.id === 'plan-active-e2e')?.status).toBe('paused');
    expect(after.clinicalRecords.find((item) => item.patientId === 'patient-e2e')?.planId).toBe('plan-draft-e2e');
    expect(after.events.some((event) => event.type === 'plan_activated' && event.planId === 'plan-draft-e2e')).toBe(true);
  });

  test('manual UI and Atal IA both mutate plan membership through the real surfaces', async ({ page }) => {
    const base = createState();
    const extra = secondExercise(base);
    const state = createState({ exercises: [...base.exercises, extra] });
    await seedBrowser(page, { state });

    await page.goto('/plans/plan-active-e2e');
    await page.getByRole('button', { name: 'Ejercicios' }).click();
    await page.getByRole('button', { name: /Agregar ejercicio/ }).click();
    await page.getByRole('button', { name: /Control escapular E2E/ }).click();
    await page.getByRole('button', { name: /Agregar al plan/ }).click();
    await page.getByRole('button', { name: /Guardar cambios/ }).click();
    await expect.poll(async () => (await readStore(page)).plans.find((item) => item.id === 'plan-active-e2e')?.exerciseIds)
      .toEqual(['exercise-e2e', 'exercise-second-e2e']);

    const conversation = createConversation({
      intent: 'update_plan',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: 'plan-draft-e2e',
    });
    await page.evaluate((value) => localStorage.setItem('atal:ai-conversations:v1', JSON.stringify(value)), [conversation]);
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('membership-plan', 'atal_action'),
        calls: [{
          id: 'membership-plan',
          bridge: 'atal_action',
          tool: 'plan.membership',
          input: {
            plan: { type: 'plan', id: 'plan-draft-e2e' },
            operation: 'add',
            exerciseIds: ['exercise-second-e2e'],
          },
          references: [{ type: 'plan', id: 'plan-draft-e2e' }],
        }],
      },
      {
        text: 'Ejercicio añadido al plan.',
        modelContent: { role: 'model', parts: [{ text: 'Ejercicio añadido al plan.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Añade Control escapular E2E al plan candidato.');
    await expect(page.getByText('Ejercicio añadido al plan.')).toBeVisible();

    const after = await readStore(page);
    expect(after.plans.find((item) => item.id === 'plan-draft-e2e')?.exerciseIds).toEqual(['exercise-e2e', 'exercise-second-e2e']);
    const audit = after.events.find((event) => event.toolName === 'plan.membership' && event.outcome === 'success');
    expect(audit?.transactionId).toBeTruthy();
    expect(audit?.riskLevel).toBe('reversible-write');
  });
});