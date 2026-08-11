import { expect, test } from '@playwright/test';
import { CONVERSATIONS_KEY, createState, DRAFTS_KEY, STORE_KEY, THEME_KEY } from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';
const prompt = '¿Qué sabes de este paciente?';

async function seed(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(({ state, keys }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(state));
    localStorage.setItem(keys.conversations, '[]');
    localStorage.setItem(keys.drafts, '[]');
    localStorage.setItem(keys.theme, 'light');
  }, {
    state: createState(),
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
  await page.goto(patientPath);
}

async function storedConversation(page, id) {
  return page.evaluate(({ key, conversationId }) => {
    const conversations = JSON.parse(localStorage.getItem(key) ?? '[]');
    return conversations.find((item) => item.id === conversationId) ?? null;
  }, { key: CONVERSATIONS_KEY, conversationId: id });
}

test('contextual agent persists the sent user message before the provider finishes', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  const workspace = page.getByRole('dialog', { name: 'Asistente en este paciente' });
  const conversationId = await workspace.getAttribute('data-conversation-id');
  expect(conversationId).toBeTruthy();

  let markStarted;
  let releaseProvider;
  const requestStarted = new Promise((resolve) => { markStarted = resolve; });
  const providerReleased = new Promise((resolve) => { releaseProvider = resolve; });
  await page.route('**/api/atal-ai/agent-turn-stream', async (route) => {
    markStarted();
    await providerReleased;
    const text = 'Paciente E2E está disponible en el contexto actual.';
    const events = [
      { type: 'text_delta', text },
      { type: 'done', turn: { text, calls: [], modelContent: { role: 'model', parts: [{ text }] } } },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson; charset=utf-8',
      body: `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
    });
  });

  await workspace.getByLabel('Mensaje para Atal IA contextual').fill(prompt);
  await workspace.getByRole('button', { name: 'Enviar mensaje' }).click();
  await requestStarted;

  try {
    await expect.poll(async () => {
      const stored = await storedConversation(page, conversationId);
      return stored?.messages?.filter((message) => message.role === 'user').map((message) => message.text) ?? [];
    }, { timeout: 1000 }).toContain(prompt);
  } finally {
    releaseProvider();
  }

  await expect(workspace.getByText('Paciente E2E está disponible en el contexto actual.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar asistente' }).click();
  await expect(workspace).toHaveCount(0);

  const stored = await storedConversation(page, conversationId);
  expect(stored.messages.some((message) => message.role === 'user' && message.text === prompt)).toBe(true);
});
