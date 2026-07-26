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

async function seedReportConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-report-review',
    draftId: 'draft-live-report-review',
    intent: 'create_report',
    selectedPatientId: 'patient-e2e',
    status: 'ready_for_review',
    messages: [{
      id: 'report-review-assistant-1',
      role: 'assistant',
      text: 'Estoy revisando las sesiones completadas de Paciente E2E.',
      createdAt: '2026-07-25T13:35:00.000Z',
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

async function send(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

async function reviewSnapshot(page) {
  const state = await readStore(page);
  const session = state.sessions.find((item) => item.id === 'session-e2e');
  return {
    observation: session?.clinicalObservation,
    reviewedAt: session?.reviewedAt,
    reviewedEvents: state.events.filter((event) => event.kind === 'report_reviewed' && event.sessionId === 'session-e2e').length,
    reviewAudits: state.events.filter((event) => event.toolName === 'report.review' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini report review flow', () => {
  test('reviews a completed session through Gemini real and persists the canonical report review', async ({ page }) => {
    test.setTimeout(180_000);
    await seedReportConversation(page);
    await page.goto('/assistant');

    await send(page, 'Revisa el reporte de la sesión completada del paciente seleccionado del 21 de julio de 2026 y guarda esta observación clínica: “Buena tolerancia, continuar progresión gradual”. Hazlo ahora.');

    await expect.poll(() => reviewSnapshot(page), { timeout: 60_000 }).toMatchObject({
      observation: 'Buena tolerancia, continuar progresión gradual',
      reviewedEvents: 1,
      reviewAudits: 1,
    });
    const after = await reviewSnapshot(page);
    expect(after.reviewedAt).toBeTruthy();
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.reload();
    await expect.poll(() => reviewSnapshot(page), { timeout: 20_000 }).toMatchObject({
      observation: 'Buena tolerancia, continuar progresión gradual',
      reviewedEvents: 1,
      reviewAudits: 1,
    });
    const persisted = await reviewSnapshot(page);
    expect(persisted.reviewedAt).toBeTruthy();
  });
});
