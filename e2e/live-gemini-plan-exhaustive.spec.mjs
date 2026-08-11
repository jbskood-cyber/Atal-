import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
  readStore,
} from './fixtures.mjs';

function exerciseFrom(source, overrides) {
  return { ...structuredClone(source), ...overrides, media: { type: 'none' } };
}

async function seedNaturalPlanConversation(page) {
  const state = createState();
  const base = state.exercises[0];
  const control = exerciseFrom(base, {
    id: 'exercise-control-live',
    name: 'Control escapular Natural QA',
    sets: 3,
    repetitions: 12,
    instructions: ['Retrae suavemente las escápulas'],
    precautions: 'Sin dolor agudo',
  });
  const rotation = exerciseFrom(base, {
    id: 'exercise-rotation-live',
    name: 'Rotación externa Natural QA',
    sets: 3,
    repetitions: 10,
    instructions: ['Mantén el codo junto al cuerpo'],
    precautions: 'Sin compensar el tronco',
  });
  state.exercises.push(control, rotation);
  const plan = state.plans.find((item) => item.id === 'plan-active-e2e');
  plan.exerciseIds = ['exercise-e2e', 'exercise-control-live'];

  const conversation = createConversation({
    id: 'conversation-live-plan-natural-qa',
    draftId: 'draft-live-plan-natural-qa',
    intent: 'update_existing_plan',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    selectedExerciseId: 'exercise-control-live',
    status: 'ready_for_review',
    messages: [{
      id: 'natural-plan-context',
      role: 'assistant',
      text: 'Estoy trabajando con el plan activo de Paciente E2E.',
      createdAt: '2026-07-26T16:00:00.000Z',
      attachments: [],
    }],
  });

  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify([conversationValue]));
    localStorage.setItem(keys.drafts, JSON.stringify([]));
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    conversationValue: conversation,
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
}

async function waitForSettledAgent(page) {
  await expect(page.locator('.atal-command-processing')).toHaveCount(0, { timeout: 90_000 });
  await expect(page.getByLabel('Mensaje para Atal IA')).toBeEnabled({ timeout: 20_000 });
}

async function send(page, text) {
  await waitForSettledAgent(page);
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.fill(text);
  await expect(composer).toHaveValue(text);
  const sendButton = page.getByRole('button', { name: 'Enviar mensaje' });
  await expect(sendButton).toBeVisible();
  await sendButton.click();
}

async function naturalPlanSnapshot(page) {
  const state = await readStore(page);
  const plan = state.plans.find((item) => item.id === 'plan-active-e2e');
  const control = state.exercises.find((item) => item.id === 'exercise-control-live');
  return {
    frequency: plan?.frequency,
    goal: plan?.goal,
    exerciseIds: plan?.exerciseIds ?? [],
    controlSets: control?.sets,
    controlRepetitions: control?.repetitions,
    controlInstructions: control?.instructions ?? [],
    controlPrecautions: control?.precautions,
    exerciseUpdateSuccesses: state.events.filter((event) => event.toolName === 'exercise.update_fields' && event.outcome === 'success').length,
    membershipSuccesses: state.events.filter((event) => event.toolName === 'plan.membership' && event.outcome === 'success').length,
    planUpdateSuccesses: state.events.filter((event) => event.toolName === 'plan.update_fields' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini exhaustive natural plan QA', () => {
  test('understands natural clitic dose editing and persists only the exercise fields requested', async ({ page }) => {
    test.setTimeout(180_000);
    await seedNaturalPlanConversation(page);
    await page.goto('/assistant');

    await send(page, 'Cámbiale al segundo ejercicio la dosis a 4 series de 10 repeticiones.');

    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 90_000 }).toMatchObject({
      frequency: '3 veces por semana',
      controlSets: 4,
      controlRepetitions: 10,
      controlInstructions: ['Retrae suavemente las escápulas'],
      controlPrecautions: 'Sin dolor agudo',
      exerciseUpdateSuccesses: 1,
      planUpdateSuccesses: 0,
    });
    await waitForSettledAgent(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    await page.reload();
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 20_000 }).toMatchObject({
      controlSets: 4,
      controlRepetitions: 10,
      controlInstructions: ['Retrae suavemente las escápulas'],
      controlPrecautions: 'Sin dolor agudo',
      exerciseUpdateSuccesses: 1,
    });
  });

  test('adds and removes exercises with natural Spanish while preserving plan ownership and canonical state', async ({ page }) => {
    test.setTimeout(240_000);
    await seedNaturalPlanConversation(page);
    await page.goto('/assistant');

    await send(page, 'Agrégale al plan el ejercicio Rotación externa Natural QA.');
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 90_000 }).toMatchObject({
      exerciseIds: expect.arrayContaining(['exercise-e2e', 'exercise-control-live', 'exercise-rotation-live']),
      membershipSuccesses: 1,
    });
    await expect(page.getByText('Cambios aplicados', { exact: true })).toBeVisible({ timeout: 90_000 });
    await waitForSettledAgent(page);

    await send(page, 'Quítale al plan el ejercicio Movilidad asistida E2E.');
    await expect.poll(async () => {
      const snapshot = await naturalPlanSnapshot(page);
      return {
        hasRemovedExercise: !snapshot.exerciseIds.includes('exercise-e2e'),
        hasControl: snapshot.exerciseIds.includes('exercise-control-live'),
        hasRotation: snapshot.exerciseIds.includes('exercise-rotation-live'),
        membershipSuccesses: snapshot.membershipSuccesses,
      };
    }, { timeout: 90_000 }).toMatchObject({
      hasRemovedExercise: true,
      hasControl: true,
      hasRotation: true,
      membershipSuccesses: 2,
    });

    await waitForSettledAgent(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();
    await expect.poll(async () => {
      const state = await readStore(page);
      const plan = state.plans.find((item) => item.id === 'plan-active-e2e');
      return {
        patientId: plan?.patientId,
        status: plan?.status,
        exerciseIds: plan?.exerciseIds ?? [],
      };
    }, { timeout: 20_000 }).toMatchObject({
      patientId: 'patient-e2e',
      status: 'active',
      exerciseIds: ['exercise-control-live', 'exercise-rotation-live'],
    });
  });

  test('replaces one exercise naturally and reads back the exact canonical membership', async ({ page }) => {
    test.setTimeout(240_000);
    await seedNaturalPlanConversation(page);
    await page.goto('/assistant');

    await send(page, 'Sustituye el segundo ejercicio, Control escapular Natural QA, por Rotación externa Natural QA.');
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 90_000 }).toMatchObject({
      exerciseIds: ['exercise-e2e', 'exercise-rotation-live'],
      membershipSuccesses: 1,
      exerciseUpdateSuccesses: 0,
      planUpdateSuccesses: 0,
    });
    await waitForSettledAgent(page);

    await send(page, '¿Qué ejercicios tiene este plan? Dime los nombres exactos usando únicamente lo guardado en Atal.');
    await waitForSettledAgent(page);
    const assistantMessages = page.locator('.atal-command-message.is-assistant');
    await expect(assistantMessages.last()).toContainText('Movilidad asistida E2E', { timeout: 90_000 });
    await expect(assistantMessages.last()).toContainText('Rotación externa Natural QA');
    await expect(assistantMessages.last()).not.toContainText('Control escapular Natural QA');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 20_000 }).toMatchObject({
      exerciseIds: ['exercise-e2e', 'exercise-rotation-live'],
      membershipSuccesses: 1,
    });
  });

  test('executes a compound natural plan edit without contaminating exercise instructions', async ({ page }) => {
    test.setTimeout(240_000);
    await seedNaturalPlanConversation(page);
    await page.goto('/assistant');

    await send(page, 'Cámbiale al plan la frecuencia a 4 veces por semana y al segundo ejercicio ponle 5 series de 8 repeticiones.');
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 120_000 }).toMatchObject({
      frequency: '4 veces por semana',
      controlSets: 5,
      controlRepetitions: 8,
      controlInstructions: ['Retrae suavemente las escápulas'],
      controlPrecautions: 'Sin dolor agudo',
      exerciseUpdateSuccesses: 1,
      planUpdateSuccesses: 1,
      membershipSuccesses: 0,
    });
    await waitForSettledAgent(page);
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => naturalPlanSnapshot(page), { timeout: 20_000 }).toMatchObject({
      frequency: '4 veces por semana',
      controlSets: 5,
      controlRepetitions: 8,
      controlInstructions: ['Retrae suavemente las escápulas'],
      controlPrecautions: 'Sin dolor agudo',
    });
  });
});
