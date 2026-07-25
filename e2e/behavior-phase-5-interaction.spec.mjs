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

  test('note edit can be cancelled without mutating or leaking the abandoned draft into a new note', async ({ page }) => {
    const state = createState();
    state.notes = [{
      id: 'note-e2e',
      patientId: 'patient-e2e',
      content: 'Nota original E2E',
      professional: 'Fisioterapeuta E2E',
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    }];

    await seed(page, state);
    await page.goto('/patients/patient-e2e');
    await page.getByRole('button', { name: 'Notas' }).click();

    const before = await readStore(page);
    const note = page.locator('.atal-note-history article').filter({ hasText: 'Nota original E2E' });
    await note.getByRole('button', { name: 'Editar' }).click();

    const composer = page.getByPlaceholder('Escribe una observación clínica…');
    await expect(composer).toHaveValue('Nota original E2E');
    await composer.fill('Borrador de nota que debe descartarse');

    await page.getByRole('button', { name: 'Cancelar edición de nota' }).click();
    expect(await readStore(page)).toEqual(before);
    await expect(composer).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Guardar nota' })).toBeVisible();

    await note.getByRole('button', { name: 'Editar' }).click();
    await expect(composer).toHaveValue('Nota original E2E');
    expect(await readStore(page)).toEqual(before);
  });

  test('professional profile settings can cancel an abandoned draft without mutating the store', async ({ page }) => {
    const state = createState();
    state.settings.professionalName = 'Profesional original E2E';
    state.settings.specialty = 'Fisioterapia deportiva';
    state.settings.clinic = 'Clínica original';

    await seed(page, state);
    await page.goto('/settings/profile');

    const before = await readStore(page);
    await page.getByLabel('Nombre profesional').fill('Nombre descartable E2E');
    await page.getByLabel('Especialidad').fill('Especialidad descartable');
    await page.getByLabel('Centro o clínica').fill('Clínica descartable');

    await page.getByRole('button', { name: 'Cancelar cambios' }).click();
    expect(await readStore(page)).toEqual(before);
    await expect(page.getByLabel('Nombre profesional')).toHaveValue('Profesional original E2E');
    await expect(page.getByLabel('Especialidad')).toHaveValue('Fisioterapia deportiva');
    await expect(page.getByLabel('Centro o clínica')).toHaveValue('Clínica original');
  });

  test('AI instructions settings can cancel an abandoned draft without mutating the store', async ({ page }) => {
    const state = createState();
    state.settings.aiInstructions = 'Instrucción original E2E';

    await seed(page, state);
    await page.goto('/settings/ai');

    const before = await readStore(page);
    const instructions = page.getByLabel('Indicaciones para las respuestas');
    await instructions.fill('Instrucción descartable E2E');

    await page.getByRole('button', { name: 'Cancelar cambios' }).click();
    expect(await readStore(page)).toEqual(before);
    await expect(instructions).toHaveValue('Instrucción original E2E');
  });

  test('mobile dock stays out of the way while shell overlays are open and returns after close', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, createState());
    await page.goto('/patients');

    const dock = page.locator('.atal-mobile-dock');
    await expect(dock).not.toHaveClass(/is-hidden/);

    await page.getByRole('button', { name: 'Buscar en Atal' }).click();
    await expect(page.getByRole('dialog', { name: 'Buscar en Atal' })).toBeVisible();
    await expect(dock).toHaveClass(/is-hidden/);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dock).not.toHaveClass(/is-hidden/);

    await page.getByRole('button', { name: /notificaciones sin leer/ }).click();
    await expect(page.getByRole('dialog', { name: 'Notificaciones' })).toBeVisible();
    await expect(dock).toHaveClass(/is-hidden/);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dock).not.toHaveClass(/is-hidden/);

    await page.getByRole('button', { name: 'Crear nuevo' }).click();
    await expect(page.getByRole('dialog', { name: 'Crear nuevo' })).toBeVisible();
    await expect(dock).toHaveClass(/is-hidden/);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dock).not.toHaveClass(/is-hidden/);
  });
});
