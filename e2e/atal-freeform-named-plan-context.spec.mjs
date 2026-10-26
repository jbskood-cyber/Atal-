import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY, createConversation, createDraftResponse, createState,
  mockAnalyze, readStore, seedBrowser,
} from './fixtures.mjs';

test('freeform named-patient plan draft selects exactly the authorized context without writes', async ({ page }) => {
  const conversation = createConversation({
    id: 'conversation-context-qa',
    draftId: 'draft-context-qa',
    intent: 'summarize_patient',
    patientMode: 'none',
    selectedPatientId: '',
  });
  await seedBrowser(page, { state: createState(), conversations: [conversation] });
  await mockAnalyze(page, createDraftResponse({
    intent: 'create_plan_for_existing_patient',
    responseMode: 'draft',
    selectedPatientId: 'patient-e2e',
    patient: { name: 'Paciente E2E' },
    plan: { title: 'Plan hombro Fresh QA', status: 'draft' },
  }));
  await page.goto('/assistant');
  const before = await readStore(page);

  await page.getByLabel('Mensaje para Atal IA').fill(
    'Crea para Paciente E2E un plan llamado Plan hombro Fresh QA de 6 semanas y déjalo como borrador.'
  );
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();

  await expect.poll(() => page.evaluate((key) => {
    const conversations = JSON.parse(localStorage.getItem(key) ?? '[]');
    return conversations.find((entry) => entry.id === 'conversation-context-qa')?.workContext;
  }, CONVERSATIONS_KEY)).toMatchObject({
    intent: 'create_plan_for_existing_patient',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
  });

  const after = await readStore(page);
  expect(after.patients).toEqual(before.patients);
  expect(after.plans).toEqual(before.plans);
  expect(after.events).toEqual(before.events);
});

test('freeform named plan draft can be reviewed, approved and saved exactly once', async ({ page }) => {
  const conversation = createConversation({
    id: 'conversation-context-apply-qa', draftId: 'draft-context-apply-qa',
    intent: 'summarize_patient', patientMode: 'none', selectedPatientId: '',
  });
  await seedBrowser(page, { state: createState(), conversations: [conversation] });
  await mockAnalyze(page, createDraftResponse({
    intent: 'create_plan_for_existing_patient', responseMode: 'draft',
    assistantMessage: 'Preparé un borrador de plan para Paciente E2E.',
    selectedPatientId: 'patient-e2e', patient: { name: 'Paciente E2E' },
    plan: {
      title: 'Plan hombro Fresh QA determinista', focus: 'Movilidad y fortalecimiento progresivo',
      goal: 'Recuperar movilidad y fuerza del hombro', status: 'draft',
      duration: { value: 6, unit: 'weeks', customText: '' },
      frequency: { value: 3, period: 'week', customText: '' },
    },
  }));
  await page.goto('/assistant');
  await page.getByLabel('Mensaje para Atal IA').fill(
    'Crea para Paciente E2E un plan llamado Plan hombro Fresh QA determinista, de 6 semanas, 3 veces por semana. Déjalo como borrador.'
  );
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByRole('region', { name: 'Borrador preparado' })).toBeVisible({ timeout: 20_000 });

  const before = await readStore(page);
  expect(before.plans.some((plan) => plan.title === 'Plan hombro Fresh QA determinista')).toBe(false);
  await page.getByRole('button', { name: 'Aplicar cambios' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const beforeConfirm = await readStore(page);
  expect(beforeConfirm.plans).toEqual(before.plans);
  await dialog.getByRole('button', { name: /Continuar|Confirmar y aplicar/ }).click();

  await expect.poll(async () => (await readStore(page)).plans.filter(
    (plan) => plan.title === 'Plan hombro Fresh QA determinista'
  ).length).toBe(1);
  const after = await readStore(page);
  const plan = after.plans.find((item) => item.title === 'Plan hombro Fresh QA determinista');
  expect(plan.patientId).toBe('patient-e2e');
  expect(plan.status).toBe('draft');
  expect(after.events.some((event) => event.toolName === 'plan.create_for_patient' && event.outcome === 'success')).toBe(true);

  await page.reload();
  const reloaded = await readStore(page);
  expect(reloaded.plans.filter((item) => item.title === 'Plan hombro Fresh QA determinista')).toHaveLength(1);
});
