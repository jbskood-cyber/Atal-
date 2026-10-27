import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('patient preview closes without losing archived filter, typed search or record data', async ({ page }) => {
  const state = createState();
  state.patients.push({ ...structuredClone(state.patients[0]), id: 'patient-peek-archived', name: 'Marina Vista Rápida', status: 'archived' });
  await seedBrowser(page, { state });
  await page.goto('/patients');

  await page.getByRole('button', { name: 'Archivados' }).click();
  await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('Marina');
  await page.getByRole('button', { name: 'Vista rápida de Marina Vista Rápida' }).click();
  const peek = page.getByRole('dialog', { name: 'Vista rápida: Marina Vista Rápida' });
  await expect(peek).toBeVisible();
  await expect(peek).toContainText('Archivado');
  await expect(peek.getByText('Vista rápida · Solo lectura')).toBeVisible();
  await peek.getByRole('button', { name: 'Volver sin perder filtros' }).click();
  await expect(peek).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Buscar paciente' })).toHaveValue('Marina');
  await expect(page.getByRole('button', { name: 'Archivados' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atal-dense-row')).toHaveCount(1);
  const after = await readStore(page);
  expect(after.patients).toEqual(state.patients);
  expect(after.plans).toEqual(state.plans);
});

test('draft plan preview provides real attributes and can open existing full detail', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/plans');
  await page.getByRole('button', { name: /Borradores/ }).click();
  await page.getByRole('textbox', { name: 'Buscar planes' }).fill('candidato');
  await page.getByRole('button', { name: 'Vista rápida de Plan candidato E2E' }).click();
  const peek = page.getByRole('dialog', { name: 'Vista rápida: Plan candidato E2E' });
  await expect(peek).toContainText('Borrador');
  await expect(peek).toContainText('Paciente E2E');
  await peek.getByRole('button', { name: 'Abrir plan completo' }).click();
  await expect(page).toHaveURL(/\/plans\/plan-draft-e2e$/);
  await page.locator('.atal-desktop-header').getByRole('link', { name: 'Planes' }).click();
  await expect(page.getByRole('textbox', { name: 'Buscar planes' })).toHaveValue('candidato');
  await expect(page.getByRole('button', { name: /Borradores/ })).toHaveAttribute('aria-pressed', 'true');
  expect((await readStore(page)).plans).toEqual(state.plans);
});

test('global search preview returns exactly to the same query and category without navigation', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/');
  await page.locator('.atal-desktop-search').click();
  const search = page.getByRole('dialog', { name: 'Buscar en Atal' });
  const input = search.getByRole('textbox', { name: 'Buscar pacientes, planes, ejercicios y reportes' });
  await search.getByRole('button', { name: 'Pacientes', exact: true }).click();
  await input.fill('Paciente E2E');
  await search.getByRole('button', { name: 'Vista rápida de Paciente E2E' }).click();
  const inline = search.getByRole('region', { name: 'Vista rápida: Paciente E2E' });
  await expect(inline).toBeVisible();
  await expect(search.getByRole('textbox')).toHaveCount(0);
  await inline.getByRole('button', { name: 'Volver a resultados' }).click();
  await expect(search).toBeVisible();
  await expect(input).toHaveValue('Paciente E2E');
  await expect(search.getByRole('button', { name: 'Pacientes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(search.locator('a[href="/patients/patient-e2e"]')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect((await readStore(page)).patients).toEqual(state.patients);
});

test('mobile patient peek closes with Escape and restores scroll and filtered list', async ({ page }) => {
  const state = createState();
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state, theme: 'dark' });
  await page.goto('/patients');
  await page.getByRole('textbox', { name: 'Buscar paciente' }).fill('Paciente E2E');
  const trigger = page.getByRole('button', { name: 'Vista rápida de Paciente E2E' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Vista rápida: Paciente E2E' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Vista rápida: Paciente E2E' })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Buscar paciente' })).toHaveValue('Paciente E2E');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect((await readStore(page)).patients).toEqual(state.patients);
});

for (const spec of [
  { id: 'patient-peek-desktop-dark', route: '/patients', width: 1366, height: 768, theme: 'dark', button: 'Vista rápida de Paciente E2E' },
  { id: 'plan-peek-mobile-light', route: '/plans', width: 390, height: 844, theme: 'light', button: 'Vista rápida de Plan activo E2E' },
]) {
  test(`visual: ${spec.id}`, async ({ page }, info) => {
    await page.setViewportSize({ width: spec.width, height: spec.height });
    await seedBrowser(page, { state: createState(), theme: spec.theme });
    await page.goto(spec.route);
    await page.getByRole('button', { name: spec.button }).click();
    await expect(page.getByRole('dialog', { name: /^Vista rápida:/ })).toBeVisible();
    const layout = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      drawerWidth: document.querySelector('.atal-clinical-peek')?.getBoundingClientRect().width ?? 0,
    }));
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.drawerWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    await info.attach(`atal-${spec.id}.png`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  });
}
