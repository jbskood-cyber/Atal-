import { expect, test } from '@playwright/test';
import { commandFixture, createConversation, createDraftResponse, createState, FIXED_NOW, seedBrowser } from './fixtures.mjs';

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
