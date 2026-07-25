import { expect, test } from '@playwright/test';
import { CONVERSATIONS_KEY, DRAFTS_KEY, STORE_KEY, THEME_KEY, createState, readStore } from './fixtures.mjs';

async function seed(page, state = createState()) {
  await page.goto('/');
  await page.evaluate(({ stateValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, '[]');
    localStorage.setItem(keys.drafts, '[]');
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
}

test.describe('Behavior System phase 5 interaction consistency', () => {
  test('patient edit can be cancelled without mutating or retaining the abandoned draft', async ({ page }) => {
    const state = createState();
    const patient = state.patients.find((item) => item.id === 'patient-e2e');
    expect(patient).toBeTruthy();
    const originalName = patient.name;

    await seed(page, state);
    await page.goto('/patients/patient-e2e');

    const before = await readStore(page);
    const section = page.locator('.atal-profile-section').filter({ hasText: 'Datos clínicos y contacto' });
    await section.locator('.atal-section-title button').click();

    const name = page.getByLabel('Nombre');
    await expect(name).toHaveValue(originalName);
    await name.fill('Cambio descartable E2E');

    await page.getByRole('button', { name: 'Cancelar edición' }).click();
    expect(await readStore(page)).toEqual(before);

    await section.locator('.atal-section-title button').click();
    await expect(page.getByLabel('Nombre')).toHaveValue(originalName);
    expect(await readStore(page)).toEqual(before);
  });
});
