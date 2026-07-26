import { expect, test } from '@playwright/test';
import { STORE_KEY, createState, readStore } from './fixtures.mjs';

async function seed(page) {
  await page.goto('/');
  await page.evaluate(({ key, state }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORE_KEY, state: createState() });
}

test('patient profile cancel discards draft edits while save persists them', async ({ page }) => {
  await seed(page);
  await page.goto('/patients/patient-e2e');

  const section = page.locator('section.atal-profile-section').filter({ has: page.getByRole('heading', { name: 'Datos clínicos y contacto' }) });
  const editButton = section.locator('.atal-section-title button');

  await editButton.click();
  const name = section.getByLabel('Nombre');
  await name.fill('Nombre temporal no guardado');

  await page.getByRole('button', { name: 'Cancelar edición' }).click();
  let state = await readStore(page);
  expect(state.patients.find((patient) => patient.id === 'patient-e2e').name).toBe('Paciente E2E');

  await section.getByRole('button', { name: 'Editar datos del paciente' }).click();
  await expect(section.getByLabel('Nombre')).toHaveValue('Paciente E2E');

  await section.getByLabel('Nombre').fill('Paciente E2E actualizado');
  await section.getByRole('button', { name: 'Guardar datos' }).click();

  state = await readStore(page);
  expect(state.patients.find((patient) => patient.id === 'patient-e2e').name).toBe('Paciente E2E actualizado');
  await expect(page.getByRole('heading', { name: 'Paciente E2E actualizado' })).toBeVisible();
});
