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

async function seedPlanConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-plan-create',
    draftId: 'draft-live-plan-create',
    intent: 'create_plan_for_existing_patient',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'plan-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Paciente E2E. Puedo crear un plan nuevo cuando me indiques los datos.',
      createdAt: '2026-07-25T10:20:00.000Z',
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
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function planSnapshot(page) {
  const state = await readStore(page);
  const plan = state.plans.find((item) => item.title === 'Rehabilitación lumbar IA');
  return {
    exists: Boolean(plan),
    patientId: plan?.patientId,
    frequency: plan?.frequency,
    status: plan?.status,
    createEvents: state.events.filter((event) => event.toolName === 'plan.create_simple' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini plan creation', () => {
  test('creates and applies a structured draft plan for the selected patient through the real app', async ({ page }) => {
    test.setTimeout(180_000);
    await seedPlanConversation(page);
    await page.goto('/assistant');

    await page.getByLabel('Mensaje para Atal IA').fill(
      'Crea un plan nuevo para el paciente seleccionado llamado “Rehabilitación lumbar IA”, con frecuencia “4 días por semana”, enfocado en movilidad lumbar y déjalo como borrador. Hazlo ahora.',
    );
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    const preparedDraft = page.getByRole('region', { name: 'Borrador preparado' });
    await expect(preparedDraft).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => planSnapshot(page), { timeout: 5_000 }).toMatchObject({ exists: false, createEvents: 0 });

    const thread = page.locator('.atal-command-thread');
    await thread.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }));
    const apply = preparedDraft.getByRole('button', { name: 'Aplicar cambios' });
    await expect(apply).toBeVisible();
    await apply.click();

    await expect.poll(() => planSnapshot(page), { timeout: 60_000 }).toMatchObject({
      exists: true,
      patientId: 'patient-e2e',
      frequency: '4 días por semana',
      status: 'draft',
      createEvents: 1,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      exists: true,
      patientId: 'patient-e2e',
      frequency: '4 días por semana',
      status: 'draft',
    });
  });
});
