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

  test('new patient UI creates patient + initial record atomically through canonical transaction', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/patients/new');

    await page.getByLabel('Nombre completo').fill('Paciente Browser Nuevo');
    await page.getByLabel('WhatsApp').fill('4441234567');
    await page.getByLabel('Edad').fill('32');
    await page.getByLabel('Motivo / diagnóstico').fill('Dolor lumbar mecánico');
    await page.getByLabel('Notas clínicas').fill('Evaluación inicial creada desde la UI.');
    await page.getByRole('button', { name: /Guardar paciente/ }).click();

    await expect(page).toHaveURL(/\/patients\/[^/]+$/);
    const after = await readStore(page);
    const patient = after.patients.find((item) => item.name === 'Paciente Browser Nuevo');
    expect(patient).toBeTruthy();
    expect(patient.contact.phone).toBe('4441234567');
    expect(patient.age).toBe(32);

    const record = after.clinicalRecords.find((item) => item.patientId === patient.id);
    expect(record).toBeTruthy();
    expect(record.reasonForVisit).toBe('Dolor lumbar mecánico');
    expect(record.clinicalNotes).toBe('Evaluación inicial creada desde la UI.');

    const audit = after.events.find((event) => event.kind === 'action_applied' && event.intent === 'patient.create' && event.entityId === patient.id);
    expect(audit).toBeTruthy();
    expect(audit.origin).toBe('manual');
    expect(audit.transactionId).toBeTruthy();
    expect(audit.affectedEntities).toEqual(expect.arrayContaining([
      { type: 'patient', id: patient.id },
      { type: 'clinical-record', id: record.id },
    ]));
  });

  test('patient archive and restore UI preserves shared lifecycle semantics', async ({ page }) => {
    const state = createState();
    const activePlan = state.plans.find((plan) => plan.patientId === 'patient-e2e' && plan.status === 'active');
    expect(activePlan).toBeTruthy();
    await seedBrowser(page, { state });

    await page.goto('/patients/patient-e2e');
    await page.getByRole('button', { name: 'Archivar paciente' }).click();

    let after = await readStore(page);
    expect(after.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('archived');
    expect(after.plans.find((item) => item.id === activePlan.id)?.status).toBe('paused');
    expect(after.events.some((event) => event.kind === 'patient_archived' && event.patientId === 'patient-e2e')).toBe(true);
    expect(after.events.some((event) => event.kind === 'plan_paused' && event.planId === activePlan.id)).toBe(true);

    await page.getByRole('button', { name: 'Restaurar paciente' }).click();
    after = await readStore(page);
    expect(after.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('active');
    expect(after.plans.find((item) => item.id === activePlan.id)?.status).toBe('paused');
    expect(after.events.some((event) => event.kind === 'patient_restored' && event.patientId === 'patient-e2e')).toBe(true);
  });
});
