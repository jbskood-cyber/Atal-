import { expect, test } from '@playwright/test';
import {
  CONVERSATIONS_KEY,
  DRAFTS_KEY,
  STORE_KEY,
  THEME_KEY,
  createConversation,
  createState,
  readStore,
} from './fixtures.mjs';

async function seedFreshPlanConversation(page) {
  const state = createState();
  state.plans = state.plans.filter((plan) => plan.patientId !== 'patient-e2e');
  state.sessions = state.sessions.filter((session) => session.patientId !== 'patient-e2e');
  state.clinicalRecords = state.clinicalRecords.map((record) => (
    record.patientId === 'patient-e2e' ? { ...record, planId: '' } : record
  ));

  const conversation = createConversation({
    id: 'conversation-live-plan-fresh-natural',
    draftId: 'draft-live-plan-fresh-natural',
    status: 'empty',
    messages: [],
    intent: 'summarize_patient',
    patientMode: 'none',
    selectedPatientId: '',
    selectedPlanId: '',
    selectedExerciseId: '',
  });

  await page.goto('/');
  await page.evaluate(({ stateValue, conversationValue, keys }) => {
    localStorage.clear();
    localStorage.setItem(keys.store, JSON.stringify(stateValue));
    localStorage.setItem(keys.conversations, JSON.stringify([conversationValue]));
    localStorage.setItem(keys.drafts, JSON.stringify([]));
    localStorage.setItem(keys.theme, 'light');
  }, {
    stateValue: state,
    conversationValue: conversation,
    keys: {
      store: STORE_KEY,
      conversations: CONVERSATIONS_KEY,
      drafts: DRAFTS_KEY,
      theme: THEME_KEY,
    },
  });
}

async function waitForSettledAgent(page) {
  await expect(page.locator('.atal-command-processing')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByLabel('Mensaje para Atal IA')).toBeEnabled({ timeout: 20_000 });
}

async function send(page, text) {
  await waitForSettledAgent(page);
  const composer = page.getByLabel('Mensaje para Atal IA');
  const userMessages = page.locator('.atal-command-message.is-user');
  const messageCountBefore = await userMessages.count();
  const sendButton = page.getByRole('button', { name: 'Enviar mensaje' });

  await composer.fill(text);
  await expect(composer).toHaveValue(text);
  await expect(sendButton).toBeEnabled({ timeout: 5_000 });

  await page.evaluate(() => {
    window.__atalLiveDispatchDiagnostic = {
      clicks: 0,
      submits: 0,
      lastClickDefaultPrevented: null,
      lastSubmitDefaultPrevented: null,
    };

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('button[aria-label="Enviar mensaje"]')) {
        window.__atalLiveDispatchDiagnostic.clicks += 1;
        window.__atalLiveDispatchDiagnostic.lastClickDefaultPrevented = event.defaultPrevented;
      }
    }, { capture: true, once: true });

    document.addEventListener('submit', (event) => {
      window.__atalLiveDispatchDiagnostic.submits += 1;
      window.__atalLiveDispatchDiagnostic.lastSubmitDefaultPrevented = event.defaultPrevented;
    }, { capture: true, once: true });
  });

  const dispatched = async () => (
    (await composer.inputValue()) === ''
    && (await userMessages.count()) > messageCountBefore
  );

  await sendButton.click();

  try {
    await expect.poll(dispatched, { timeout: 5_000 }).toBe(true);
    return;
  } catch (clickError) {
    const valueAfterClick = await composer.inputValue();
    const messageCountAfterClick = await userMessages.count();
    if (valueAfterClick !== text || messageCountAfterClick > messageCountBefore) {
      throw clickError;
    }
  }

  // Product-equivalent fallback: the compact composer supports keyboard submission.
  // Use it only when the visible enabled button click demonstrably left the prompt untouched.
  await composer.focus();
  await composer.press('Enter');

  try {
    await expect.poll(dispatched, { timeout: 10_000 }).toBe(true);
  } catch (keyboardError) {
    const diagnostic = await page.evaluate(() => ({
      ...(window.__atalLiveDispatchDiagnostic ?? {}),
      activeElement: document.activeElement?.tagName ?? null,
    }));
    const finalValue = await composer.inputValue();
    const finalMessageCount = await userMessages.count();
    throw new Error(`Composer dispatch failed after click and keyboard paths: ${JSON.stringify({ diagnostic, finalValue, messageCountBefore, finalMessageCount })}`, { cause: keyboardError });
  }
}

async function planSnapshot(page) {
  const state = await readStore(page);
  const matches = state.plans.filter((plan) => plan.title === 'Plan hombro Fresh QA');
  const plan = matches[0];
  const exerciseNames = (plan?.exerciseIds ?? []).map((exerciseId) => state.exercises.find((exercise) => exercise.id === exerciseId)?.name).filter(Boolean);
  return {
    count: matches.length,
    patientId: plan?.patientId,
    title: plan?.title,
    duration: plan?.duration,
    frequency: plan?.frequency,
    goal: plan?.goal,
    focus: plan?.focus,
    status: plan?.status,
    exerciseNames,
    planCreateSuccesses: state.events.filter((event) => event.toolName === 'plan.create' && event.outcome === 'success').length,
    membershipSuccesses: state.events.filter((event) => event.toolName === 'plan.membership' && event.outcome === 'success').length,
    exerciseUpdateSuccesses: state.events.filter((event) => event.toolName === 'exercise.update_fields' && event.outcome === 'success').length,
  };
}

async function approvePreparedAction(page) {
  const apply = page.getByRole('button', { name: 'Aplicar cambios' });
  await expect(apply).toBeVisible({ timeout: 120_000 });
  await apply.click();
  const confirmation = page.getByRole('dialog');
  if (await confirmation.isVisible().catch(() => false)) {
    await confirmation.getByRole('button', { name: /Continuar|Confirmar y aplicar/ }).click();
  }
  await waitForSettledAgent(page);
}

test.describe('Live Gemini fresh natural plan creation', () => {
  test('creates the correct patient plan from a completely fresh general conversation, adds and edits an exercise naturally, and survives reload/readback', async ({ page }) => {
    test.setTimeout(420_000);
    await seedFreshPlanConversation(page);
    await page.goto('/assistant');

    await send(page, 'Crea para Paciente E2E un plan llamado “Plan hombro Fresh QA”, de 6 semanas, 3 veces por semana, con objetivo “Recuperar movilidad y fuerza del hombro” y enfoque “Movilidad y fortalecimiento progresivo”. Déjalo como borrador para revisarlo antes de guardar.');

    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      count: 0,
      planCreateSuccesses: 0,
    });
    await approvePreparedAction(page);

    await expect.poll(() => planSnapshot(page), { timeout: 120_000 }).toMatchObject({
      count: 1,
      patientId: 'patient-e2e',
      title: 'Plan hombro Fresh QA',
      duration: '6 semanas',
      frequency: '3 veces por semana',
      goal: 'Recuperar movilidad y fuerza del hombro',
      focus: 'Movilidad y fortalecimiento progresivo',
      status: 'draft',
      planCreateSuccesses: 1,
    });

    await send(page, 'Agrégale a ese plan el ejercicio Movilidad asistida E2E.');
    await approvePreparedAction(page);
    await expect.poll(() => planSnapshot(page), { timeout: 120_000 }).toMatchObject({
      exerciseNames: ['Movilidad asistida E2E'],
      membershipSuccesses: 1,
    });

    await send(page, 'Ahora cámbiale a ese ejercicio la dosis a 4 series de 10 repeticiones y deja sus demás campos exactamente como están.');
    await approvePreparedAction(page);
    await expect.poll(() => planSnapshot(page), { timeout: 120_000 }).toMatchObject({
      exerciseUpdateSuccesses: 1,
    });

    await page.reload();
    await expect.poll(() => planSnapshot(page), { timeout: 20_000 }).toMatchObject({
      count: 1,
      patientId: 'patient-e2e',
      title: 'Plan hombro Fresh QA',
      duration: '6 semanas',
      frequency: '3 veces por semana',
      goal: 'Recuperar movilidad y fuerza del hombro',
      focus: 'Movilidad y fortalecimiento progresivo',
      status: 'draft',
      exerciseNames: ['Movilidad asistida E2E'],
      planCreateSuccesses: 1,
      membershipSuccesses: 1,
      exerciseUpdateSuccesses: 1,
    });

    await send(page, 'Usando únicamente lo guardado en Atal, dime el nombre exacto, duración, frecuencia, objetivo, enfoque y ejercicio de ese plan.');
    await waitForSettledAgent(page);
    const assistantMessages = page.locator('.atal-command-message.is-assistant');
    await expect(assistantMessages.last()).toContainText('Plan hombro Fresh QA', { timeout: 120_000 });
    await expect(assistantMessages.last()).toContainText('6 semanas');
    await expect(assistantMessages.last()).toContainText('3 veces por semana');
    await expect(assistantMessages.last()).toContainText('Recuperar movilidad y fuerza del hombro');
    await expect(assistantMessages.last()).toContainText('Movilidad y fortalecimiento progresivo');
    await expect(assistantMessages.last()).toContainText('Movilidad asistida E2E');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
