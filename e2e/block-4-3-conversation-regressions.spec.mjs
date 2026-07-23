import { expect, test } from '@playwright/test';
import { createDraftResponse, createState, mockAnalyze } from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';

async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('atal:store:v2', JSON.stringify(state));
    localStorage.setItem('atal:ai-conversations:v1', '[]');
    localStorage.setItem('atal:ai-drafts:v1', '[]');
    localStorage.setItem('atal:theme', 'light');
  }, createState());
  await page.goto('/assistant');
  await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
  await expect(page.getByText('Pregunta cualquier cosa sobre Atal o prepara un cambio revisable.')).toBeVisible();
}

async function send(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

function storedConversation({ id, updatedAt, scope, text, contextKey, contextSurface }) {
  return {
    id,
    draftId: `draft-${id}`,
    scope,
    createdAt: updatedAt,
    updatedAt,
    status: 'empty',
    composerText: '',
    transcription: '',
    messages: text ? [{ id: `message-${id}`, role: 'assistant', text, createdAt: updatedAt, attachments: [] }] : [],
    attachmentMetadata: [],
    privateContact: { phone: '', email: '', address: '', emergencyContact: '' },
    workContext: { intent: 'create_patient_plan', patientMode: 'new', selectedPatientId: '', selectedPlanId: '', selectedExerciseId: '' },
    ...(contextKey ? { contextKey } : {}),
    ...(contextSurface ? { contextSurface } : {}),
  };
}

test.describe('Block 4.3 conversational regressions', () => {
  test('assistant messages keep a readable mobile width instead of collapsing to one word per line', async ({ page }) => {
    await openAssistant(page);
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Puedo conversar contigo, consultar Atal y actuar cuando me lo pidas.',
          calls: [],
          modelContent: { role: 'model', parts: [{ text: 'Respuesta natural.' }] },
        }),
      });
    });

    await send(page, 'Hola, ¿cómo puedes ayudarme?');
    const body = page.locator('.atal-command-message.is-assistant > div').last();
    await expect(body).toContainText('Puedo conversar contigo');
    const box = await body.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(240);
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);
  });

  test('a new completed turn sends the visible global conversation history to Gemini', async ({ page }) => {
    await openAssistant(page);
    const payloads = [];
    let turn = 0;
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      payloads.push(route.request().postDataJSON());
      turn += 1;
      const text = turn === 1
        ? 'Claro. Puedo hablar contigo de forma natural y también operar Atal.'
        : 'Sí. Recuerdo que acabamos de hablar sobre cómo puedo ayudarte.';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text, calls: [], modelContent: { role: 'model', parts: [{ text }] } }),
      });
    });

    await send(page, 'Hola, ¿puedes conversar conmigo?');
    await expect(page.getByText(/Puedo hablar contigo/)).toBeVisible();
    await send(page, '¿Recuerdas lo que acabamos de hablar?');
    await expect(page.getByText(/Recuerdo que acabamos de hablar/)).toBeVisible();

    expect(payloads).toHaveLength(2);
    expect(payloads[1].conversationHistory).toEqual([
      { role: 'user', parts: [{ text: 'Hola, ¿puedes conversar conmigo?' }] },
      { role: 'model', parts: [{ text: 'Claro. Puedo hablar contigo de forma natural y también operar Atal.' }] },
    ]);
  });

  test('a plain image question remains conversational and does not open a clinical review', async ({ page }) => {
    await openAssistant(page);
    let requestPayload;
    await page.route('**/api/atal-ai/agent-turn', async (route) => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'La imagen muestra el interior de una habitación. No veo información clínica suficiente para modificar un expediente.',
          calls: [],
          modelContent: { role: 'model', parts: [{ text: 'Descripción visual.' }] },
        }),
      });
    });

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Adjuntar' }).click();
    await page.getByText('Fotos').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'habitacion.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('imagen-e2e') });
    await send(page, '¿Qué es esto?');

    await expect(page.getByText(/interior de una habitación/)).toBeVisible();
    await expect(page.getByText('Revisa antes de guardar')).toHaveCount(0);
    expect(requestPayload.allowedTools).not.toContain('patient.update');
    expect(requestPayload.allowedTools).not.toContain('clinical_record.upsert');
  });

  test('the global assistant ignores a newer contextual conversation and hides it from global history', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(({ state, conversations }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('atal:store:v2', JSON.stringify(state));
      localStorage.setItem('atal:ai-conversations:v1', JSON.stringify(conversations));
      localStorage.setItem('atal:ai-drafts:v1', '[]');
      localStorage.setItem('atal:theme', 'light');
    }, {
      state: createState(),
      conversations: [
        storedConversation({ id: 'global-old', updatedAt: '2026-07-23T10:00:00.000Z', scope: 'global', text: 'Mensaje exclusivo del asistente general.' }),
        storedConversation({ id: 'context-new', updatedAt: '2026-07-23T12:00:00.000Z', scope: 'contextual', text: 'Mensaje que solo pertenece al paciente.', contextKey: 'patient:patient-e2e', contextSurface: 'patient' }),
      ],
    });

    await page.goto('/assistant');
    await expect(page.getByText('Mensaje exclusivo del asistente general.')).toBeVisible();
    await expect(page.getByText('Mensaje que solo pertenece al paciente.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Acciones de la conversación' }).click();
    await page.getByRole('menuitem', { name: /Ver conversaciones/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Conversaciones generales' });
    await expect(dialog.getByText('Mensaje exclusivo del asistente general.')).toBeVisible();
    await expect(dialog.getByText('Mensaje que solo pertenece al paciente.')).toHaveCount(0);
  });

  test('structured work keeps the full reviewable draft inside the global assistant', async ({ page }) => {
    await openAssistant(page);
    await mockAnalyze(page, createDraftResponse({
      intent: 'create_patient_plan',
      assistantMessage: 'Preparé el borrador general para revisión.',
    }));

    await send(page, 'Prepara un plan de tratamiento de cuatro semanas.');
    await expect(page.getByText('Preparé el borrador general para revisión.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar cambios' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revisar todo' })).toBeVisible();
    await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
  });

  test('explicit handoff creates a new global session without copying the contextual transcript', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate((state) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('atal:store:v2', JSON.stringify(state));
      localStorage.setItem('atal:ai-conversations:v1', '[]');
      localStorage.setItem('atal:ai-drafts:v1', '[]');
      localStorage.setItem('atal:theme', 'light');
    }, createState());
    await page.goto(patientPath);
    await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
    const workspace = page.getByRole('dialog', { name: 'Asistente en este paciente' });
    const contextualId = await workspace.getAttribute('data-conversation-id');
    await workspace.getByRole('button', { name: 'Más opciones de Atal IA' }).click();
    await workspace.getByRole('button', { name: /Abrir Atal IA completa/ }).click();

    await expect(page).toHaveURL(/\/assistant$/);
    await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
    await expect(page.getByText(/Contexto recibido desde Paciente E2E/)).toBeVisible();
    await expect(page.getByLabel('Mensaje para Atal IA')).toHaveValue(/Continúa el trabajo sobre Paciente E2E/);

    const conversations = await page.evaluate(() => JSON.parse(localStorage.getItem('atal:ai-conversations:v1') ?? '[]'));
    expect(contextualId).toBeTruthy();
    const contextual = conversations.find((item) => item.scope === 'contextual' && item.contextKey);
    const global = conversations.find((item) => item.scope === 'global');
    expect(contextual).toBeTruthy();
    expect(contextual.scope).toBe('contextual');
    expect(contextual.contextKey).toBeTruthy();
    expect(global).toBeTruthy();
    expect(global.id).not.toBe(contextual.id);
    expect(global.contextKey).toBeUndefined();
    expect(global.messages).toHaveLength(1);
    expect(global.messages[0].text).toContain('La conversación contextual permanece separada');
  });
});
