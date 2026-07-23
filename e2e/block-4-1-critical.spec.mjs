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

function agentModelContent(id, bridge) {
  return { role: 'model', parts: [{ functionCall: { id, name: bridge, args: {} } }] };
}

async function mockAgent(page, turns) {
  let index = 0;
  await page.route('**/api/atal-ai/agent-turn', async (route) => {
    const turn = turns[Math.min(index, turns.length - 1)];
    index += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(turn) });
  });
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
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('read-patient', 'atal_read'),
        calls: [{
          id: 'read-patient',
          bridge: 'atal_read',
          tool: 'app.read',
          input: { resource: 'patient_profile', patient: { type: 'patient', id: 'patient-e2e' }, limit: 10 },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Plan activo: Plan activo E2E. La última sesión terminó con dolor 3/10.',
        modelContent: { role: 'model', parts: [{ text: 'Resumen preparado.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');

    const before = await readStore(page);
    await sendMessage(page, 'Resume al paciente seleccionado.');

    await expect(page.getByText(/Plan activo: Plan activo E2E./)).toBeVisible();
    const after = await readStore(page);
    expect(after).toEqual(before);
  });

  test('explicit reversible AI note executes immediately, audits safely and undoes exactly', async ({ page }) => {
    const conversation = createConversation({ intent: 'add_patient_note' });
    await seed(page, { conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('add-note', 'atal_action'),
        calls: [{
          id: 'add-note',
          bridge: 'atal_action',
          tool: 'patient_note.add',
          input: { patient: { type: 'patient', id: 'patient-e2e' }, content: 'Nota clínica E2E reversible.' },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Añadí la nota clínica al expediente.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');

    await sendMessage(page, 'Añade una nota clínica demostrativa.');
    await expect(page.getByText('Listo. Añadí la nota clínica al expediente.')).toBeVisible();

    let state = await readStore(page);
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

    await page.getByRole('button', { name: 'Deshacer último cambio' }).click();
    await expect(page.getByText('Último cambio deshecho.')).toBeVisible();

    state = await readStore(page);
    expect(state.notes).toHaveLength(0);
    expect(state.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'undone')).toBe(true);
  });

  test('sensitive plan activation cancels without mutation and confirms only the target plan', async ({ page }) => {
    const state = createState();
    state.plans = state.plans.map((plan) => plan.id === 'plan-active-e2e' ? { ...plan, status: 'paused' } : plan);
    const conversation = createConversation({ intent: 'update_plan_status', selectedPlanId: 'plan-draft-e2e' });
    await seed(page, { state, conversations: [conversation] });
    const activationCall = (id) => ({
      text: '',
      modelContent: agentModelContent(id, 'atal_action'),
      calls: [{
        id,
        bridge: 'atal_action',
        tool: 'plan.activate',
        input: { plan: { type: 'plan', id: 'plan-draft-e2e' } },
        references: [{ type: 'plan', id: 'plan-draft-e2e' }],
      }],
    });
    await mockAgent(page, [
      activationCall('activate-cancel'),
      activationCall('activate-confirm'),
      {
        text: 'Listo. Activé únicamente el plan candidato.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');

    await sendMessage(page, 'Activa el plan candidato.');
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();

    let stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('draft');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(false);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('draft');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(false);

    await sendMessage(page, 'Activa el plan candidato.');
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Listo. Activé únicamente el plan candidato.')).toBeVisible();

    stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('active');
    expect(stored.plans.find((plan) => plan.id === 'plan-active-e2e').status).toBe('paused');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(true);
  });

  test('normalized duplicate patient request produces one actionable clarification with zero mutation', async ({ page }) => {
    const state = createState();
    state.patients[0] = { ...state.patients[0], name: 'Jose QA' };
    const conversation = createConversation({ intent: 'create_patient_plan', patientMode: 'new', selectedPatientId: '' });
    await seed(page, { state, conversations: [conversation] });
    await mockAgent(page, [{
      text: '',
      modelContent: agentModelContent('duplicate-patient', 'atal_action'),
      calls: [{
        id: 'duplicate-patient',
        bridge: 'atal_action',
        tool: 'patient.create',
        input: {
          patient: { name: 'José QA', diagnosis: 'Prueba de identidad normalizada', affectedArea: 'Hombro' },
          record: { reasonForVisit: 'Prueba de identidad normalizada', goals: ['Recuperar movilidad'] },
          plan: { title: 'Plan de prueba', focus: 'Movilidad', duration: '4 semanas', frequency: '3 veces por semana', goal: 'Recuperar movilidad', exerciseIds: [], status: 'draft' },
        },
        references: [],
      }],
    }]);
    await page.goto('/assistant');

    const before = await readStore(page);
    await sendMessage(page, 'Crea a José QA con un plan.');

    await expect(page.getByText(/Ya existe el paciente “Jose QA”/)).toBeVisible();
    const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CONVERSATIONS_KEY);
    expect(persisted[0].agentTask.status).toBe('needs-clarification');
    const after = await readStore(page);
    expect(after).toEqual(before);
  });

  test('pending sensitive action is blocked after a newer manual state appears', async ({ page }) => {
    const state = createState();
    state.plans = state.plans.map((plan) => plan.id === 'plan-active-e2e' ? { ...plan, status: 'paused' } : plan);
    const conversation = createConversation({ intent: 'update_plan_status', selectedPlanId: 'plan-draft-e2e' });
    await seed(page, { state, conversations: [conversation] });
    await mockAgent(page, [{
      text: '',
      modelContent: agentModelContent('stale-activation', 'atal_action'),
      calls: [{
        id: 'stale-activation',
        bridge: 'atal_action',
        tool: 'plan.activate',
        input: { plan: { type: 'plan', id: 'plan-draft-e2e' } },
        references: [{ type: 'plan', id: 'plan-draft-e2e' }],
      }],
    }]);
    await page.goto('/assistant');

    await sendMessage(page, 'Activa el plan candidato.');
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();

    await page.evaluate((key) => {
      const value = JSON.parse(localStorage.getItem(key));
      const plan = value.plans.find((item) => item.id === 'plan-draft-e2e');
      plan.status = 'archived';
      plan.updatedAt = '2026-07-22T13:00:00.000Z';
      localStorage.setItem(key, JSON.stringify(value));
    }, STORE_KEY);

    await page.reload();
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText(/El plan no puede pasar de archived a active./)).toBeVisible();

    const stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('archived');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(false);
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
