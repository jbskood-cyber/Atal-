import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

test('clinical reports retain search, pending flag and patient scope when returning from a report', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/activity?view=reports&patientId=patient-e2e');

  await expect(page.getByRole('button', { name: 'Reportes', exact: true }).last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Paciente seleccionado' })).toContainText('Paciente E2E');
  await page.getByRole('textbox', { name: 'Buscar actividad clínica' }).fill('Paciente E2E');
  await page.getByRole('button', { name: 'Mostrar solo pendientes' }).click();
  await expect(page.getByRole('button', { name: 'Mostrar solo pendientes' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atal-activity-feed > button')).toHaveCount(1);

  await page.locator('.atal-activity-feed > button').first().click();
  await expect(page).toHaveURL(/\/activity\/session-e2e$/);
  await expect(page.getByRole('navigation', { name: 'Navegación del reporte clínico' })).toBeVisible();
  await page.getByRole('button', { name: 'Reportes del paciente' }).click();
  await expect(page).toHaveURL(/\/activity\?view=reports&patientId=patient-e2e/);
  await expect(page.getByRole('textbox', { name: 'Buscar actividad clínica' })).toHaveValue('Paciente E2E');
  await expect(page.getByRole('button', { name: 'Mostrar solo pendientes' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.atal-activity-feed > button')).toHaveCount(1);

  const after = await readStore(page);
  expect(after.sessions).toEqual(state.sessions);
  expect(after.patients).toEqual(state.patients);
  expect(after.plans).toEqual(state.plans);
});

test('patient profile restores last section after navigating away, independently per patient', async ({ page }) => {
  const state = createState();
  state.patients.push({
    ...structuredClone(state.patients[0]),
    id: 'patient-second-e2e',
    name: 'Segundo paciente sintético',
  });
  await seedBrowser(page, { state });
  await page.goto('/patients/patient-e2e');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Historial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Historial cronológico' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver a pacientes' }).click();
  await expect(page).toHaveURL(/\/patients$/);

  await page.goto('/patients/patient-second-e2e');
  await expect(page.getByRole('button', { name: 'Resumen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/patients/patient-e2e');
  await expect(page.getByRole('button', { name: 'Historial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Historial cronológico' })).toBeVisible();

  const after = await readStore(page);
  expect(after.patients).toEqual(state.patients);
  expect(after.clinicalRecords).toEqual(state.clinicalRecords);
});

test('clinical report contextual navigation respects unsaved observation guard', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/activity/session-e2e');
  await page.getByPlaceholder('Escribe una observación clínica…').fill('Texto clínico sintético aún sin guardar');
  await page.getByRole('button', { name: 'Reportes del paciente' }).click();
  await expect(page.getByRole('dialog')).toContainText('¿Salir sin guardar?');
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(page).toHaveURL(/\/activity\/session-e2e$/);
  await expect(page.getByPlaceholder('Escribe una observación clínica…')).toHaveValue('Texto clínico sintético aún sin guardar');

  await page.getByRole('button', { name: 'Ver expediente del paciente' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Descartar y salir' }).click();
  await expect(page).toHaveURL(/\/patients\/patient-e2e$/);
  expect((await readStore(page)).sessions).toEqual(state.sessions);
});

test('empty clinical activity results can be cleared without writing to any patient data', async ({ page }) => {
  const state = createState();
  await seedBrowser(page, { state });
  await page.goto('/activity?view=reports');
  await page.getByRole('textbox', { name: 'Buscar actividad clínica' }).fill('Sin coincidencia clínica QA');
  await page.getByRole('button', { name: 'Mostrar solo pendientes' }).click();
  await expect(page.getByRole('status')).toContainText('Sin reportes coincidentes');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('textbox', { name: 'Buscar actividad clínica' })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Mostrar solo pendientes' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.atal-activity-feed > button')).toHaveCount(1);
  const after = await readStore(page);
  expect(after.sessions).toEqual(state.sessions);
  expect(after.events).toEqual(state.events);
});
