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

async function seedSessionConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-session-flow',
    draftId: 'draft-live-session-flow',
    intent: 'summarize_sessions',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    selectedPlanId: 'plan-active-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'session-flow-assistant-1',
      role: 'assistant',
      text: 'Estoy trabajando con Paciente E2E y su Plan activo E2E.',
      createdAt: '2026-07-25T13:15:00.000Z',
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

async function sessionSnapshot(page) {
  const state = await readStore(page);
  const generated = state.sessions.find((session) => session.id !== 'session-e2e' && session.patientId === 'patient-e2e' && session.planId === 'plan-active-e2e');
  return {
    startAudits: state.events.filter((event) => event.toolName === 'session.start_or_resume' && event.outcome === 'success').length,
    startedEvents: state.events.filter((event) => event.kind === 'session_started' && event.patientId === 'patient-e2e' && event.planId === 'plan-active-e2e').length,
    completeAudits: state.events.filter((event) => event.toolName === 'session.complete' && event.outcome === 'success').length,
    generatedExists: Boolean(generated),
    generatedStatus: generated?.status,
    endPain: generated?.endPain,
    endEnergy: generated?.endEnergy,
    effort: generated?.effort,
    comment: generated?.comment,
  };
}

async function send(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

test.describe('Live Gemini guided session flow', () => {
  test('starts and completes a selected patient session through Gemini real and persists it', async ({ page }) => {
    test.setTimeout(180_000);
    await seedSessionConversation(page);
    await page.goto('/assistant');

    await send(page, 'Inicia una sesión guiada para el paciente y plan seleccionados con dolor inicial 4, energía 7 y comentario “Inicio IA”. Hazlo ahora.');

    await expect.poll(() => sessionSnapshot(page), { timeout: 60_000 }).toMatchObject({
      startAudits: 1,
      startedEvents: 1,
      completeAudits: 0,
      generatedExists: false,
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(page, 'Completa la sesión del paciente y plan seleccionados como completada con dolor final 3, energía final 6, esfuerzo 5 y comentario “Sesión IA completada”. Hazlo ahora.');

    await expect.poll(() => sessionSnapshot(page), { timeout: 60_000 }).toMatchObject({
      startAudits: 1,
      startedEvents: 1,
      completeAudits: 1,
      generatedExists: true,
      generatedStatus: 'completed',
      endPain: 3,
      endEnergy: 6,
      effort: 5,
      comment: 'Sesión IA completada',
    });
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => sessionSnapshot(page), { timeout: 20_000 }).toMatchObject({
      startAudits: 1,
      startedEvents: 1,
      completeAudits: 1,
      generatedExists: true,
      generatedStatus: 'completed',
      endPain: 3,
      endEnergy: 6,
      effort: 5,
      comment: 'Sesión IA completada',
    });
  });
});
