import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
} from './fixtures.mjs';

async function seed(page, conversationId) {
  const state = createState();
  const conversation = createConversation({
    id: conversationId,
    draftId: `draft-${conversationId}`,
    status: 'empty',
    messages: [],
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

async function sendAndReadConversation(page, conversationId, prompt) {
  await page.goto('/assistant');
  await page.getByLabel('Mensaje para Atal IA').fill(prompt);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  await page.waitForFunction(({ key, id }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const conversation = JSON.parse(raw).find((item) => item.id === id);
    if (!conversation || conversation.status === 'processing') return false;
    const assistantMessages = conversation.messages?.filter((item) => item.role === 'assistant') ?? [];
    return assistantMessages.length > 0 || Boolean(conversation.error);
  }, { key: CONVERSATIONS_KEY, id: conversationId }, { timeout: 120_000 });

  return page.evaluate(({ key, id }) => {
    const conversations = JSON.parse(localStorage.getItem(key) ?? '[]');
    return conversations.find((item) => item.id === id);
  }, { key: CONVERSATIONS_KEY, id: conversationId });
}

test.describe('Live Gemini conversational regression', () => {
  test('a plain greeting returns visible assistant text without EMPTY_MODEL_TURN', async ({ page }) => {
    test.setTimeout(180_000);
    const conversationId = 'conversation-live-gemini-plain-chat';
    await seed(page, conversationId);

    const conversation = await sendAndReadConversation(page, conversationId, 'Hola, ¿en qué me puedes ayudar?');
    const assistant = [...(conversation.messages ?? [])].reverse().find((item) => item.role === 'assistant');

    expect(conversation.error ?? '').toBe('');
    expect(assistant?.text?.trim().length ?? 0).toBeGreaterThan(0);
    expect(assistant?.text ?? '').not.toMatch(/no recibió una respuesta válida del modelo/i);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
  });

  test('a read-only patient count question returns an answer without EMPTY_MODEL_TURN', async ({ page }) => {
    test.setTimeout(180_000);
    const conversationId = 'conversation-live-gemini-patient-count';
    await seed(page, conversationId);

    const conversation = await sendAndReadConversation(page, conversationId, '¿Cuántos pacientes tengo?');
    const assistant = [...(conversation.messages ?? [])].reverse().find((item) => item.role === 'assistant');

    expect(conversation.error ?? '').toBe('');
    expect(assistant?.text ?? '').toMatch(/paciente/i);
    expect(assistant?.text ?? '').toMatch(/\b1\b|\bun\b|\buno\b/i);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
  });
});
