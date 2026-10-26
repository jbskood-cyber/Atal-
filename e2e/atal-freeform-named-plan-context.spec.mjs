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
