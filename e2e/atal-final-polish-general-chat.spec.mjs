import { expect, test } from '@playwright/test';
import { commandFixture, createConversation, createDraftResponse, createState, FIXED_NOW, readStore, seedBrowser } from './fixtures.mjs';

function message(id, role, text) {
  return { id, role, text, createdAt: FIXED_NOW, attachments: [] };
}

test('general Atal IA keeps draft safety while presenting a compact text-first chat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const conversation = createConversation({
    id: 'conversation-final-polish',
    draftId: 'draft-final-polish',
    status: 'ready_for_review',
    selectedPatientId: 'patient-e2e',
    messages: [
      message('user-final-polish', 'user', 'Actualiza la nota.'),
      message('assistant-final-polish', 'assistant', 'Preparé el cambio para el paciente seleccionado.'),
    ],
  });

  const draft = {
    ...createDraftResponse({
      intent: 'add_patient_note',
      responseMode: 'command',
      assistantMessage: 'Añadir una nota clínica breve.',
      selectedPatientId: 'patient-e2e',
      command: commandFixture('add_patient_note', {
        patientId: 'patient-e2e',
        content: 'Prefiere sesiones por la tarde.',
      }),
    }).draft,
    id: 'draft-final-polish',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    baseVersions: { patientUpdatedAt: FIXED_NOW, recordUpdatedAt: FIXED_NOW, planUpdatedAt: FIXED_NOW },
  };

  await seedBrowser(page, { state: createState(), conversations: [conversation], drafts: [draft] });
  await page.goto('/assistant');

  const userBubble = page.locator('.atal-command-message.is-user > div');
  await expect(userBubble).toBeVisible();
  const userBox = await userBubble.boundingBox();
  expect(userBox?.width ?? 999).toBeLessThan(230);

  await expect(page.locator('.atal-command-message.is-user time')).toBeHidden();
  await expect(page.locator('.atal-command-message.is-user > span')).toBeHidden();

  const assistantCopy = page.locator('.atal-command-message.is-assistant > div').first();
  await expect(assistantCopy).toBeVisible();
  const assistantBackground = await assistantCopy.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(assistantBackground).toBe('rgba(0, 0, 0, 0)');

  await expect(page.locator('.atal-draft-card-header')).toBeHidden();
  await expect(page.getByText('Acción preparada')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Aplicar cambios' })).toBeVisible();

  const composer = page.locator('.atal-command-composer');
  const composerBox = await composer.boundingBox();
  expect(composerBox?.height ?? 999).toBeLessThanOrEqual(48);

  const sendButton = page.getByRole('button', { name: 'Enviar mensaje' });
  await page.getByLabel('Mensaje para Atal IA').fill('Mensaje corto');
  await expect(sendButton).toBeVisible();
  const sendBox = await sendButton.boundingBox();
  expect(sendBox?.width ?? 999).toBeLessThanOrEqual(40);
  expect(sendBox?.height ?? 999).toBeLessThanOrEqual(40);
});

test('typing the next message while Atal is streaming never loses the user draft', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const conversation = createConversation({
    id: 'conversation-streaming-composer',
    draftId: 'draft-streaming-composer',
    status: 'empty',
    messages: [],
  });
  await seedBrowser(page, { state: createState(), conversations: [conversation], drafts: [] });

  await page.route('**/api/atal-ai/agent-turn-stream', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson; charset=utf-8',
      body: `${JSON.stringify({ type: 'done', turn: { text: 'Respuesta completada.', calls: [] } })}\n`,
    });
  });
  await page.route('**/api/atal-ai/agent-turn', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'Respuesta completada.', calls: [] }),
    });
  });

  await page.goto('/assistant');
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.fill('Primer mensaje');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('button', { name: 'Detener respuesta' })).toBeVisible();

  const queuedText = 'Siguiente mensaje mientras respondes';
  await composer.fill(queuedText);
  await expect(composer).toHaveValue(queuedText);

  await expect(page.getByText('Respuesta completada.', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Detener respuesta' })).toHaveCount(0);
  await expect(composer).toHaveValue(queuedText);
  await expect(page.getByRole('button', { name: 'Enviar mensaje' })).toBeVisible();
});

test('fresh natural plan draft keeps Gemini intent instead of stale empty conversation intent', async ({ page }) => {
  const state = createState();
  state.plans = state.plans.filter((plan) => plan.patientId !== 'patient-e2e');
  state.sessions = state.sessions.filter((session) => session.patientId !== 'patient-e2e');
  state.clinicalRecords = state.clinicalRecords.map((record) => record.patientId === 'patient-e2e' ? { ...record, planId: '' } : record);
  const conversation = createConversation({
    id: 'conversation-fresh-plan-context-regression',
    draftId: 'draft-fresh-plan-context-regression',
    status: 'empty',
    messages: [],
    intent: 'summarize_patient',
    patientMode: 'none',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
  });
  await seedBrowser(page, { state, conversations: [conversation], drafts: [] });

  await page.route('**/api/atal-ai/analyze', async (route) => {
    const response = createDraftResponse({
      intent: 'create_patient_plan',
      responseMode: 'draft',
      assistantMessage: 'He preparado el borrador del plan para Paciente E2E.',
      selectedPatientId: '',
    });
    response.draft.patient = {
      ...response.draft.patient,
      name: 'Paciente E2E',
      affectedArea: 'Hombro',
      goals: ['Recuperar movilidad y fuerza del hombro'],
    };
    response.draft.plan = {
      ...response.draft.plan,
      title: 'Plan hombro Fresh QA',
      goal: 'Recuperar movilidad y fuerza del hombro',
      focus: 'Movilidad y fortalecimiento progresivo',
      duration: { value: 6, unit: 'weeks', customText: '' },
      frequency: { value: 3, period: 'week', customText: '' },
      status: 'draft',
    };
    response.draft.missingFields = ['patient.age', 'patient.birthDate', 'patient.sex', 'patient.providedDiagnosis'];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });

  await page.goto('/assistant');
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.fill('Crea para Paciente E2E un plan llamado “Plan hombro Fresh QA”, de 6 semanas, 3 veces por semana. Déjalo como borrador para revisarlo antes de guardar.');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  const apply = page.getByRole('button', { name: 'Aplicar cambios' });
  await expect(apply).toBeVisible();
  await apply.click();

  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: /Continuar|Confirmar y aplicar/ }).click();

  await expect.poll(async () => {
    const next = await readStore(page);
    return next.plans.find((plan) => plan.title === 'Plan hombro Fresh QA')?.patientId;
  }).toBe('patient-e2e');
  await expect(page.getByText(/Unsupported draft intent/)).toHaveCount(0);
});
