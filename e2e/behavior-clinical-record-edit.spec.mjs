import { expect, test } from '@playwright/test';
import { STORE_KEY, createState, readStore } from './fixtures.mjs';

async function seed(page) {
  await page.goto('/');
  await page.evaluate(({ key, state }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORE_KEY, state: createState() });
}

test('clinical record cancel discards draft without versioning while save persists one version', async ({ page }) => {
  await seed(page);
  await page.goto('/patients/patient-e2e/clinical-record');

  const initial = await readStore(page);
  const original = initial.clinicalRecords.find((record) => record.patientId === 'patient-e2e');
  expect(original).toBeTruthy();
  const initialVersionCount = initial.clinicalRecordVersions.length;

  await page.getByRole('button', { name: 'Editar expediente' }).click();
  const valuation = page.locator('section.atal-record-section').filter({ has: page.getByRole('heading', { name: 'Valoración inicial' }) });
  const reason = valuation.locator('textarea').first();
  await expect(reason).toHaveValue(original.reasonForVisit);
  await reason.fill('Motivo temporal no guardado');

  await page.getByRole('button', { name: 'Cancelar edición' }).click();

  let state = await readStore(page);
  let persisted = state.clinicalRecords.find((record) => record.patientId === 'patient-e2e');
  expect(persisted.reasonForVisit).toBe(original.reasonForVisit);
  expect(persisted.version).toBe(original.version);
  expect(state.clinicalRecordVersions).toHaveLength(initialVersionCount);

  await page.getByRole('button', { name: 'Editar expediente' }).click();
  const reasonAfterCancel = valuation.locator('textarea').first();
  await expect(reasonAfterCancel).toHaveValue(original.reasonForVisit);
  await reasonAfterCancel.fill('Motivo clínico guardado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect.poll(async () => {
    const current = await readStore(page);
    return current.clinicalRecords.find((record) => record.patientId === 'patient-e2e')?.reasonForVisit;
  }).toBe('Motivo clínico guardado');

  state = await readStore(page);
  persisted = state.clinicalRecords.find((record) => record.patientId === 'patient-e2e');
  expect(persisted.version).toBe(original.version + 1);
  expect(state.clinicalRecordVersions).toHaveLength(initialVersionCount + 1);
  expect(state.clinicalRecordVersions.at(-1)?.snapshot?.reasonForVisit).toBe(original.reasonForVisit);
});
