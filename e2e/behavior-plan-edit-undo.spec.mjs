import { expect, test } from '@playwright/test';
import { CONVERSATIONS_KEY, DRAFTS_KEY, STORE_KEY, THEME_KEY, createState, readStore } from './fixtures.mjs';

async function seed(page) {
  const state = createState();
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
  return state;
}

test('manual plan edit can cancel, save and undo the same canonical change', async ({ page }) => {
  const seeded = await seed(page);
  const plan = seeded.plans[0];
  expect(plan).toBeTruthy();
  const originalFrequency = plan.frequency;
  const changedFrequency = originalFrequency === '4 días' ? '3 días' : '4 días';

  await page.goto(`/plans/${plan.id}`);
  await page.getByRole('button', { name: 'Resumen' }).click();
  const frequency = page.getByLabel('Frecuencia');
  await expect(frequency).toHaveValue(originalFrequency);

  const before = await readStore(page);
  await frequency.fill(changedFrequency);
  await page.getByRole('button', { name: 'Cancelar cambios' }).click();
  await expect(frequency).toHaveValue(originalFrequency);
  expect(await readStore(page)).toEqual(before);

  await frequency.fill(changedFrequency);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect.poll(async () => (await readStore(page)).plans.find((item) => item.id === plan.id)?.frequency)
    .toBe(changedFrequency);
  await expect(page.getByRole('button', { name: 'Deshacer cambio' })).toBeVisible();

  await page.getByRole('button', { name: 'Deshacer cambio' }).click();
  await expect.poll(async () => (await readStore(page)).plans.find((item) => item.id === plan.id)?.frequency)
    .toBe(originalFrequency);
  await expect(frequency).toHaveValue(originalFrequency);
});
