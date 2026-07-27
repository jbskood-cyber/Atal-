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

async function seedFreshPlanConversation(page) {
  const state = createState();
  state.plans = state.plans.filter((plan) => plan.patientId !== 'patient-e2e');
  state.clinicalRecords = state.clinicalRecords.map((record) => (
    record.patientId === 'patient-e2e' ? { ...record, planId: '' } : record
  ));

  const conversation = createConversation({
    id: 'conversation-live-plan-fresh-natural',
    draftId: 'draft-live-plan-fresh-natural',
    status: 'empty',
    messages: [],
    intent: undefined,
    patientMode: undefined,
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
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
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function waitForSettledAgent(page) {
  await expect(page.locator('.atal-command-processing')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByLabel('Mensaje para Atal IA')).toBeEnabled({ timeout: 20_000 });
}

async function planSnapshot(page) {
  const state = await readStore(page);
  const matches = state.plans.filter((plan) => plan.title === 'Plan hombro Fresh QA');
  const plan = matches[0];
  return {
    count: matches.length,
    patientId: plan?.patientId,
    title: plan?.title,
    duration: plan?.duration,
    frequency: plan?.frequency,
    goal: plan?.goal,
    focus: plan?.focus,
    status: plan?.status,
    createEvents: state.events.filter((event) => event.kind === 'plan_created' && event.planId === plan?.id).length,
  };
}

test.describe('Live Gemini fresh natural plan creation', () => {
  test('creates the correct patient plan from a completely fresh general conversation and survives reload/readback', async ({ page }) => {
    test.setTimeout(300_000);
    await seedFreshPlanConversation(page);
    await page.goto('/assistant');

    const composer = page.getByLabel('Mensaje para Atal IA');
    await composer.fill(
      'Crea para Paciente E2E un plan llamado “Plan hombro Fresh QA”, de 6 semanas, 3 veces por semana, con objetivo “Recuperar movilidad y fuerza del hombro” y enfoque “Movilidad y fortalecimiento progresivo”. Déjalo como borrador para revisarlo antes de guardar.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await waitForSettledAgent(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    // A fresh request must prepare work without mutating canonical state before approval.
    await expect.poll(() => planSnapshot(page), { timeout: 10_000 }).toMatchObject({ count: 0, createEvents: 0 });
    const apply = page.getByRole('button', { name: 'Aplicar cambios' });
    await expect(apply).toBeVisible({ timeout: 120_000 });
    await apply.click();

    const confirmation = page.getByRole('dialog', { name: '¿Aplicar este borrador?' });
    await expect(confirmation).toBeVisible({ timeout: 20_000 });
    await confirmation.getByRole('button', { name: 'Confirmar y aplicar' }).click();

    await expect.poll(() => planSnapshot(page), { timeout: 120_000 }).toMatchObject({
      count: 1,
      patientId: 'patient-e2e',
      title: 'Plan hombro Fresh QA',
      duration: '6 semanas',
      frequency: '3 veces por semana',
      goal: 'Recuperar movilidad y fuerza del hombro',
      focus: 'Movilidad y fortalecimiento progresivo',
      status: 'draft',
      createEvents: 1,
    });

    await page.reload();
    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      count: 1,
      patientId: 'patient-e2e',
      duration: '6 semanas',
      frequency: '3 veces por semana',
      goal: 'Recuperar movilidad y fuerza del hombro',
      focus: 'Movilidad y fortalecimiento progresivo',
      status: 'draft',
      createEvents: 1,
    });

    await waitForSettledAgent(page);
    await composer.fill('¿Qué plan tiene Paciente E2E? Dime el nombre, duración, frecuencia y objetivo usando únicamente lo guardado en Atal.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await waitForSettledAgent(page);

    const lastAssistant = page.locator('.atal-command-message.is-assistant').last();
    await expect(lastAssistant).toContainText('Plan hombro Fresh QA', { timeout: 120_000 });
    await expect(lastAssistant).toContainText(/6 semanas/i);
    await expect(lastAssistant).toContainText(/3 veces por semana/i);
    await expect(lastAssistant).toContainText(/Recuperar movilidad y fuerza del hombro/i);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});