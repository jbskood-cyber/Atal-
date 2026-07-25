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

async function seedSettingsConversation(page) {
  const state = createState();
  const conversation = createConversation({
    id: 'conversation-live-settings',
    draftId: 'draft-live-settings',
    intent: 'update_settings',
    status: 'ready_for_review',
    messages: [{
      id: 'settings-assistant-1',
      role: 'assistant',
      text: 'Puedo actualizar preferencias, perfil profesional y apariencia de Atal.',
      createdAt: '2026-07-25T14:00:00.000Z',
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
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.click();
  await composer.fill('');
  await composer.pressSequentially(text);
  await expect(composer).toHaveValue(text);
  const sendButton = page.getByRole('button', { name: 'Enviar mensaje' });
  await expect(sendButton).toBeVisible({ timeout: 20_000 });
  await sendButton.click();
}

async function settingsSnapshot(page) {
  const state = await readStore(page);
  return {
    haptics: state.settings.haptics,
    aiSuggestions: state.settings.aiSuggestions,
    professionalName: state.settings.professionalName,
    specialty: state.settings.specialty,
    clinic: state.settings.clinic,
    updateAudits: state.events.filter((event) => event.toolName === 'settings.update' && event.outcome === 'success').length,
    profileAudits: state.events.filter((event) => event.toolName === 'settings.profile_update' && event.outcome === 'success').length,
  };
}

test.describe('Live Gemini settings flow', () => {
  test('updates preferences, profile and appearance through Gemini real and persists them', async ({ page }) => {
    test.setTimeout(180_000);
    await seedSettingsConversation(page);
    await page.goto('/assistant');

    await send(page, 'Activa la vibración y desactiva las sugerencias de IA. Hazlo ahora.');
    await expect.poll(async () => {
      const snapshot = await settingsSnapshot(page);
      return { haptics: snapshot.haptics, aiSuggestions: snapshot.aiSuggestions };
    }, { timeout: 60_000 }).toEqual({ haptics: true, aiSuggestions: false });
    const preferenceState = await settingsSnapshot(page);
    expect(preferenceState.updateAudits).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(page, 'Actualiza mi perfil profesional: nombre “Dra. Ana E2E”, especialidad “Fisioterapia deportiva” y clínica “Norte E2E”. Hazlo ahora.');
    await expect.poll(async () => {
      const snapshot = await settingsSnapshot(page);
      return {
        professionalName: snapshot.professionalName,
        specialty: snapshot.specialty,
        clinic: snapshot.clinic,
      };
    }, { timeout: 60_000 }).toEqual({
      professionalName: 'Dra. Ana E2E',
      specialty: 'Fisioterapia deportiva',
      clinic: 'Norte E2E',
    });
    const profileState = await settingsSnapshot(page);
    expect(profileState.profileAudits).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(page, 'Cambia la apariencia de Atal a modo oscuro. Hazlo ahora.');
    await expect.poll(async () => page.evaluate((key) => ({
      stored: localStorage.getItem(key),
      resolved: document.documentElement.dataset.theme,
    }), THEME_KEY), { timeout: 60_000 }).toEqual({ stored: 'dark', resolved: 'dark' });
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');

    const beforeReload = await settingsSnapshot(page);
    await page.reload();
    await expect.poll(async () => {
      const snapshot = await settingsSnapshot(page);
      return {
        haptics: snapshot.haptics,
        aiSuggestions: snapshot.aiSuggestions,
        professionalName: snapshot.professionalName,
        specialty: snapshot.specialty,
        clinic: snapshot.clinic,
        updateAudits: snapshot.updateAudits,
        profileAudits: snapshot.profileAudits,
      };
    }, { timeout: 20_000 }).toEqual({
      haptics: true,
      aiSuggestions: false,
      professionalName: 'Dra. Ana E2E',
      specialty: 'Fisioterapia deportiva',
      clinic: 'Norte E2E',
      updateAudits: beforeReload.updateAudits,
      profileAudits: beforeReload.profileAudits,
    });
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_KEY), { timeout: 20_000 }).toBe('dark');
  });
});
