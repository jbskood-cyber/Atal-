import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test.describe('Behavior System Phase 6 — patient browser parity', () => {
  test('new patient UI rejects accent-normalized duplicate without mutating store', async ({ page }) => {
    const state = createState();
    state.patients[0] = { ...state.patients[0], name: 'Jose QA' };
    await seedBrowser(page, { state });

    await page.goto('/patients/new');
    const before = await readStore(page);

    await page.getByLabel('Nombre completo').fill('José QA');
    await page.getByLabel('Motivo / diagnóstico').fill('Prueba de duplicado normalizado');
    await page.getByRole('button', { name: /Guardar paciente/ }).click();

    await expect(page.getByRole('alert')).toContainText('Ya existe el paciente “Jose QA”');
    await expect(page).toHaveURL(/\/patients\/new$/);

    const after = await readStore(page);
    expect(after.patients).toEqual(before.patients);
    expect(after.clinicalRecords).toEqual(before.clinicalRecords);
  });
});
