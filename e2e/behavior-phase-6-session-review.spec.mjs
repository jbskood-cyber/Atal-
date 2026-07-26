import { expect, test } from '@playwright/test';
import { createConversation, createState, readStore, seedBrowser } from './fixtures.mjs';

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

test.describe('Behavior System Phase 6 — guided session and clinician review', () => {
  test('patient browser starts and completes a partial guided session through canonical session actions', async ({ page }) => {
    const state = createState();
    const patient = state.patients[0];
    const activePlan = state.plans.find((plan) => plan.patientId === patient.id && plan.status === 'active');
    expect(activePlan).toBeTruthy();

    await seedBrowser(page, { state });
    await page.goto(`/patients/${patient.id}/session`);
    await expect(page.getByRole('heading', { name: '¿Cómo te sientes hoy?' })).toBeVisible();

    await page.getByRole('button', { name: /Comenzar ejercicios/ }).click();
    let after = await readStore(page);
    const startEvents = after.events.filter((event) => event.kind === 'session_started' && event.patientId === patient.id && event.planId === activePlan.id);
    expect(startEvents).toHaveLength(1);
    const [started] = startEvents;

    await page.getByRole('button', { name: 'Finalizar sesión' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Terminar de todas formas' }).click();
    await expect(page.getByRole('heading', { name: 'Terminaste los ejercicios' })).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar sesión' }).click();
    await expect(page.getByText('Resumen')).toBeVisible();

    after = await readStore(page);
    const completed = after.sessions.find((session) => session.patientId === patient.id && session.planId === activePlan.id && session.startedAt === started.createdAt);
    expect(completed).toBeTruthy();
    expect(completed.status).toBe('partial');
    expect(completed.planSnapshot).toBeTruthy();
    expect(after.events.filter((event) => event.kind === 'session_started' && event.patientId === patient.id && event.planId === activePlan.id)).toHaveLength(1);
    expect(after.events.some((event) => event.kind === 'session_partial' && event.patientId === patient.id && event.planId === activePlan.id)).toBe(true);
    expect(after.notifications.some((notification) => notification.href === `/activity/${completed.id}`)).toBe(true);
  });

  test('clinician UI reviews a completed session through the canonical review action', async ({ page }) => {
    const state = createState();
    const session = state.sessions[0];
    await seedBrowser(page, { state });
    await page.goto(`/activity/${session.id}`);

    const observation = 'Evolución favorable en revisión UI Phase 6.';
    await page.getByPlaceholder('Escribe una observación clínica…').fill(observation);
    await page.getByRole('button', { name: 'Guardar y marcar revisado' }).click();
    await expect(page.getByRole('status')).toContainText('Observación guardada');

    const after = await readStore(page);
    const reviewed = after.sessions.find((item) => item.id === session.id);
    expect(reviewed.clinicalObservation).toBe(observation);
    expect(reviewed.reviewedAt).toBeTruthy();
    expect(after.events.some((event) => event.kind === 'report_reviewed' && event.sessionId === session.id)).toBe(true);
  });

  test('Atal IA reviews the same session through report.review and audited transaction semantics', async ({ page }) => {
    const state = createState();
    const session = state.sessions[0];
    const conversation = createConversation({ intent: 'review_session', selectedPatientId: session.patientId });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('review-session', 'atal_action'),
        calls: [{
          id: 'review-session',
          bridge: 'atal_action',
          tool: 'report.review',
          input: {
            session: { type: 'session', id: session.id },
            observation: 'Revisión IA Phase 6 con buena tolerancia.',
          },
          references: [{ type: 'session', id: session.id }],
        }],
      },
      {
        text: 'Listo. Guardé la revisión clínica.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Guarda mi revisión clínica de la sesión seleccionada.');
    await expect(page.getByText('Listo. Guardé la revisión clínica.')).toBeVisible();

    const after = await readStore(page);
    const reviewed = after.sessions.find((item) => item.id === session.id);
    expect(reviewed.clinicalObservation).toBe('Revisión IA Phase 6 con buena tolerancia.');
    expect(reviewed.reviewedAt).toBeTruthy();
    expect(after.events.some((event) => event.kind === 'report_reviewed' && event.sessionId === session.id)).toBe(true);
    const audit = after.events.find((event) => event.toolName === 'report.review' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
  });
});
