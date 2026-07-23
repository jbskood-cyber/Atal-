import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  commandFixture,
  createConversation,
  createDraftResponse,
  createState,
  mockAnalyze,
  readDrafts,
  readStore,
} from './fixtures.mjs';

async function seed(page, {
  state = createState(),
  conversations = [],
  drafts = [],
  theme = 'light',
} = {}) {
  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, draftValue, themeValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify(conversationValue));
    localStorage.setItem(keys.drafts, JSON.stringify(draftValue));
    localStorage.setItem(keys.theme, themeValue);
  }, {
    stateValue: state,
    conversationValue: conversations,
    draftValue: drafts,
    themeValue: theme,
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function sendMessage(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

test.describe('Block 4.1 critical E2E validation', () => {
  test('clinical pain rejects invalid text, accepts decimal comma and persists without NaN', async ({ page }) => {
    await seed(page);
    await page.goto('/patients/patient-e2e/clinical-record');

    await expect(page.getByText('Expediente clínico')).toBeVisible();
    await page.getByRole('button', { name: 'Editar expediente' }).click();

    const pain = page.getByLabel('Dolor');
    await pain.fill('3 de 10 - demostrativo.');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('status')).toContainText('El dolor debe estar entre 0 y 10.');
    await expect(page.getByText(/Versión 1/)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');

    let state = await readStore(page);
    expect(state.clinicalRecords[0].painLevel).toBe(4);
    expect(state.clinicalRecords[0].version).toBe(1);

    await pain.fill('3,5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('status')).toContainText('Expediente guardado · versión 2.');
    state = await readStore(page);
    expect(state.clinicalRecords[0].painLevel).toBe(3.5);
    expect(state.clinicalRecords[0].version).toBe(2);

    await page.reload();
    const painValue = page.locator('dt', { hasText: 'Dolor' }).locator('..').locator('dd');
    await expect(painValue).toHaveText('3.5');
    await expect(page.getByText(/Versión 2/)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('NaN');
  });

  test('Atal AI patient summary is read-only for the clinical store', async ({ page }) => {
    const conversation = createConversation({ intent: 'summarize_patient' });
    await seed(page, { conversations: [conversation] });
    await mockAnalyze(page, createDraftResponse({
      intent: 'summarize_patient',
      responseMode: 'query',
      command: commandFixture('summarize_patient', { patientId: 'patient-e2e' }),
    }));
    await page.goto('/assistant');

    const before = await readStore(page);
    await sendMessage(page, 'Resume al paciente seleccionado.');

    await expect(page.getByText(/Plan activo: Plan activo E2E\./)).toBeVisible();
    const after = await readStore(page);
    expect(after).toEqual(before);
  });

  test('reversible AI note requires confirmation, audits safely and undoes exactly', async ({ page }) => {
    const conversation = createConversation({ intent: 'add_patient_note' });
    await seed(page, { conversations: [conversation] });
    await mockAnalyze(page, createDraftResponse({
      intent: 'add_patient_note',
      responseMode: 'command',
      assistantMessage: 'Añadir una nota clínica demostrativa.',
      command: commandFixture('add_patient_note', {
        patientId: 'patient-e2e',
        content: 'Nota clínica E2E reversible.',
      }),
    }));
    await page.goto('/assistant');

    await sendMessage(page, 'Añade una nota clínica demostrativa.');
    const dialog = page.getByRole('dialog', { name: /Aplicar esta acción/ });
    await expect(dialog).toBeVisible();

    let state = await readStore(page);
    expect(state.notes).toHaveLength(0);
    expect(state.events.filter((event) => event.outcome === 'success')).toHaveLength(0);

    await dialog.getByRole('button', { name: 'Confirmar y aplicar' }).click();
    await expect(page.getByText('Cambios aplicados', { exact: true })).toBeVisible();

    state = await readStore(page);
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].content).toBe('Nota clínica E2E reversible.');
    const audit = state.events.find((event) => event.toolName === 'patient_note.add' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.transactionId).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.affectedEntities).toEqual([{ type: 'patient', id: 'patient-e2e' }]);

    const auditText = JSON.stringify(audit);
    expect(auditText).not.toContain('4440000000');
    expect(auditText).not.toContain('privado-e2e@example.test');
    expect(auditText).not.toContain('Dirección privada E2E');
    expect(auditText).not.toContain('Contacto privado E2E');
    expect(auditText).not.toMatch(/base64|data:image|hidden reasoning|razonamiento/i);

    await page.getByRole('button', { name: 'Deshacer cambio' }).click();
    await expect(page.getByText('Cambio deshecho correctamente.')).toBeVisible();

    state = await readStore(page);
    expect(state.notes).toHaveLength(0);
    expect(state.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'undone')).toBe(true);
  });

  test('sensitive plan activation cancels without mutation and confirms only the target plan', async ({ page }) => {
    const state = createState();
    state.plans = state.plans.map((plan) => plan.id === 'plan-active-e2e' ? { ...plan, status: 'paused' } : plan);
    const conversation = createConversation({
      intent: 'update_plan_status',
      selectedPlanId: 'plan-draft-e2e',
    });
    await seed(page, { state, conversations: [conversation] });
    await mockAnalyze(page, createDraftResponse({
      intent: 'update_plan_status',
      responseMode: 'command',
      selectedPlanId: 'plan-draft-e2e',
      assistantMessage: 'Activar el plan candidato.',
      command: commandFixture('activate_plan', { planId: 'plan-draft-e2e' }),
    }));
    await page.goto('/assistant');

    await sendMessage(page, 'Activa el plan candidato.');
    let dialog = page.getByRole('dialog', { name: /Aplicar esta acción/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();

    let stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('draft');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(false);

    await page.getByRole('button', { name: 'Aplicar cambios' }).click();
    dialog = page.getByRole('dialog', { name: /Aplicar esta acción/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirmar y aplicar' }).click();
    await expect(page.getByText('Cambios aplicados', { exact: true })).toBeVisible();

    stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('active');
    expect(stored.plans.find((plan) => plan.id === 'plan-active-e2e').status).toBe('paused');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(true);
  });

  test('normalized duplicate patient proposal surfaces an exact-choice clarification with zero mutation', async ({ page }) => {
    const state = createState();
    state.patients[0] = { ...state.patients[0], name: 'Jose QA' };
    const conversation = createConversation({
      intent: 'create_patient_plan',
      patientMode: 'new',
      selectedPatientId: '',
    });
    await seed(page, { state, conversations: [conversation] });
    await mockAnalyze(page, createDraftResponse({
      intent: 'create_patient_plan',
      responseMode: 'draft',
      selectedPatientId: '',
      patient: {
        name: 'José QA',
        reasonForVisit: 'Prueba de identidad normalizada',
        goals: ['Recuperar movilidad'],
      },
      plan: {
        title: 'Plan de prueba',
        goal: 'Recuperar movilidad',
        focus: 'Movilidad',
        duration: { value: 4, unit: 'weeks', customText: '' },
        frequency: { value: 3, period: 'week', customText: '' },
        progressCriteria: 'Mejorar sin dolor alto',
      },
    }));
    await page.goto('/assistant');

    const before = await readStore(page);
    await sendMessage(page, 'Crea a José QA con un plan.');

    await expect(page.getByText('Encontré a Jose QA')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usar paciente existente' })).toBeVisible();
    const after = await readStore(page);
    expect(after).toEqual(before);
  });

  test('stale patient draft is blocked after a newer manual version appears', async ({ page }) => {
    const conversation = createConversation({ intent: 'update_patient_record' });
    await seed(page, { conversations: [conversation] });
    await mockAnalyze(page, createDraftResponse({
      intent: 'update_patient_record',
      responseMode: 'draft',
      patient: {
        name: 'Paciente E2E',
        reasonForVisit: 'Actualizar expediente',
        providedDiagnosis: 'Diagnóstico propuesto por IA',
        evolutionTime: 'Tres semanas',
        goals: ['Mejorar función'],
      },
    }));
    await page.goto('/assistant');

    await sendMessage(page, 'Actualiza el diagnóstico del expediente.');
    await expect(page.getByRole('button', { name: 'Aplicar cambios' })).toBeVisible();
    await expect.poll(async () => (await readDrafts(page)).length).toBe(1);

    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key));
      const patient = state.patients.find((item) => item.id === 'patient-e2e');
      const record = state.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
      patient.diagnosis = 'Cambio manual más reciente';
      patient.updatedAt = '2026-07-22T13:00:00.000Z';
      record.providedDiagnosis = 'Cambio manual más reciente';
      record.updatedAt = '2026-07-22T13:00:00.000Z';
      localStorage.setItem(key, JSON.stringify(state));
    }, STORE_KEY);

    await page.reload();
    await expect(page.getByRole('alert')).toContainText('Esta información cambió después de crear el borrador.');
    await expect(page.getByRole('button', { name: 'Aplicar cambios' })).toBeDisabled();

    const stored = await readStore(page);
    expect(stored.patients.find((patient) => patient.id === 'patient-e2e').diagnosis).toBe('Cambio manual más reciente');
    expect(stored.clinicalRecords.find((record) => record.patientId === 'patient-e2e').providedDiagnosis).toBe('Cambio manual más reciente');
  });

  test('390px smoke preserves essential routes, themes and fatal-error-free rendering', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, { theme: 'light' });

    await page.goto('/patients/patient-e2e/clinical-record');
    await expect(page.getByText('Expediente clínico')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectNoHorizontalOverflow(page);

    await page.goto('/plans/plan-active-e2e');
    await expect(page.getByText('Plan activo E2E', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/exercises/exercise-e2e');
    await expect(page.getByText('Movilidad asistida E2E', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/assistant');
    await expect(page.getByLabel('Mensaje para Atal IA')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.evaluate((key) => localStorage.setItem(key, 'dark'), THEME_KEY);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByLabel('Mensaje para Atal IA')).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
