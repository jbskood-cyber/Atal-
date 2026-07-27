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

function cloneExercise(source, overrides) {
  return { ...structuredClone(source), ...overrides, media: { type: 'none' } };
}

async function seedPhysioBaseline(page) {
  const state = createState();
  const baseExercise = state.exercises[0];
  const strength = cloneExercise(baseExercise, {
    id: 'exercise-strength-physio-live',
    name: 'Rotación externa Flujo QA',
    category: 'Fuerza',
    objective: 'Fortalecer rotadores externos',
    instructions: ['Mantén el codo junto al cuerpo'],
    precautions: 'Sin compensar el tronco',
    sets: 3,
    repetitions: 12,
  });

  state.exercises = [baseExercise, strength];
  state.plans = [];
  state.sessions = [];
  state.events = [];
  state.notifications = [];
  state.clinicalRecords = state.clinicalRecords.map((record) => ({ ...record, planId: '' }));

  const conversation = createConversation({
    id: 'conversation-live-physio-record',
    draftId: 'draft-live-physio-record',
    intent: 'update_patient_record',
    patientMode: 'existing',
    selectedPatientId: 'patient-e2e',
    status: 'empty',
    messages: [],
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
    keys: { store: STORE_KEY, conversations: CONVERSATIONS_KEY, drafts: DRAFTS_KEY, theme: THEME_KEY },
  });
}

async function replaceConversation(page, overrides) {
  const conversation = createConversation({ status: 'empty', messages: [], ...overrides });
  await page.evaluate(({ key, draftsKey, conversationValue }) => {
    localStorage.setItem(key, JSON.stringify([conversationValue]));
    localStorage.setItem(draftsKey, JSON.stringify([]));
  }, { key: CONVERSATIONS_KEY, draftsKey: DRAFTS_KEY, conversationValue: conversation });
  await page.goto('/assistant');
  await expect(page.getByLabel('Mensaje para Atal IA')).toBeVisible({ timeout: 20_000 });
  return conversation;
}

async function waitForSettledAgent(page) {
  await expect(page.locator('.atal-command-processing')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByLabel('Mensaje para Atal IA')).toBeEnabled({ timeout: 20_000 });
}

async function send(page, text) {
  await waitForSettledAgent(page);
  const composer = page.getByLabel('Mensaje para Atal IA');
  await composer.fill(text);
  await expect(composer).toHaveValue(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}

async function applyPreparedChanges(page) {
  const apply = page.getByRole('button', { name: 'Aplicar cambios' });
  await expect(apply).toBeVisible({ timeout: 120_000 });
  await apply.click();
  const confirmation = page.getByRole('dialog', { name: '¿Aplicar este borrador?' });
  await expect(confirmation).toBeVisible({ timeout: 20_000 });
  await confirmation.getByRole('button', { name: 'Confirmar y aplicar' }).click();
}

async function currentPlan(page) {
  const state = await readStore(page);
  return state.plans.find((plan) => plan.title === 'Plan hombro integral QA');
}

async function currentGeneratedSession(page, planId) {
  const state = await readStore(page);
  return state.sessions.find((session) => session.patientId === 'patient-e2e' && session.planId === planId);
}

function successfulToolCount(state, toolName) {
  return state.events.filter((event) => event.toolName === toolName && event.outcome === 'success').length;
}

test.describe('Live Gemini complete physiotherapist workflow', () => {
  test('runs record → plan → exercises → session → report → edit → Undo → reload with canonical state', async ({ page }) => {
    test.setTimeout(720_000);
    await seedPhysioBaseline(page);
    await page.goto('/assistant');

    // 1) Clinical record: natural language must populate only the matching structured fields.
    await send(page, 'Actualiza el expediente de este paciente: dolor 6 de 10, evolución de tres semanas, empeora al elevar el brazo y no refiere hormigueo. Hazlo ahora.');
    await expect.poll(async () => {
      const state = await readStore(page);
      const record = state.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
      return {
        painLevel: record?.painLevel,
        evolution: record?.evolution,
        recordAudits: successfulToolCount(state, 'clinical_record.upsert'),
      };
    }, { timeout: 120_000 }).toMatchObject({
      painLevel: 6,
      evolution: expect.stringMatching(/tres semanas/i),
      recordAudits: 1,
    });
    await expect(page.getByRole('alert')).toHaveCount(0);

    // 2) Create a clean draft plan through Gemini and approve it through the compact safe path.
    await replaceConversation(page, {
      id: 'conversation-live-physio-plan-create',
      draftId: 'draft-live-physio-plan-create',
      intent: 'create_plan_for_existing_patient',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
    });
    await send(page, 'Crea un plan llamado “Plan hombro integral QA”, de 6 semanas, 3 veces por semana, con objetivo “Recuperar movilidad y fuerza del hombro”, enfocado en movilidad y fortalecimiento progresivo. Déjalo como borrador.');
    await applyPreparedChanges(page);

    await expect.poll(async () => {
      const state = await readStore(page);
      const plan = state.plans.find((item) => item.title === 'Plan hombro integral QA');
      return {
        patientId: plan?.patientId,
        duration: plan?.duration,
        frequency: plan?.frequency,
        goal: plan?.goal,
        status: plan?.status,
        creates: state.events.filter((event) => event.kind === 'plan_created' && event.planId === plan?.id).length,
      };
    }, { timeout: 120_000 }).toMatchObject({
      patientId: 'patient-e2e',
      duration: '6 semanas',
      frequency: '3 veces por semana',
      goal: 'Recuperar movilidad y fuerza del hombro',
      status: 'draft',
      creates: 1,
    });

    const createdPlan = await currentPlan(page);
    expect(createdPlan).toBeTruthy();

    // 3) Associate two real library exercises and then edit plan + exercise dose in one natural request.
    await replaceConversation(page, {
      id: 'conversation-live-physio-plan-edit',
      draftId: 'draft-live-physio-plan-edit',
      intent: 'update_existing_plan',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: createdPlan.id,
      selectedExerciseId: 'exercise-strength-physio-live',
    });
    await send(page, 'Añade a este plan los ejercicios “Movilidad asistida E2E” y “Rotación externa Flujo QA”. Hazlo ahora.');
    await expect.poll(async () => {
      const state = await readStore(page);
      const plan = state.plans.find((item) => item.id === createdPlan.id);
      return {
        exerciseIds: plan?.exerciseIds ?? [],
        membershipAudits: successfulToolCount(state, 'plan.membership'),
      };
    }, { timeout: 120_000 }).toMatchObject({
      exerciseIds: expect.arrayContaining(['exercise-e2e', 'exercise-strength-physio-live']),
      membershipAudits: 1,
    });

    await send(page, 'Cámbiale la frecuencia a 4 veces por semana y al ejercicio Rotación externa Flujo QA ponle 4 series de 10 repeticiones.');
    await expect.poll(async () => {
      const state = await readStore(page);
      const plan = state.plans.find((item) => item.id === createdPlan.id);
      const exercise = state.exercises.find((item) => item.id === 'exercise-strength-physio-live');
      return {
        frequency: plan?.frequency,
        sets: exercise?.sets,
        repetitions: exercise?.repetitions,
        instructions: exercise?.instructions,
        precautions: exercise?.precautions,
        planUpdates: successfulToolCount(state, 'plan.update_fields'),
        exerciseUpdates: successfulToolCount(state, 'exercise.update_fields'),
      };
    }, { timeout: 120_000 }).toMatchObject({
      frequency: '4 veces por semana',
      sets: 4,
      repetitions: 10,
      instructions: ['Mantén el codo junto al cuerpo'],
      precautions: 'Sin compensar el tronco',
      planUpdates: 1,
      exerciseUpdates: 1,
    });

    // 4) Activate the prepared plan through the canonical lifecycle action.
    await replaceConversation(page, {
      id: 'conversation-live-physio-plan-activate',
      draftId: 'draft-live-physio-plan-activate',
      intent: 'update_plan_status',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: createdPlan.id,
    });
    await send(page, 'Activa este plan. Hazlo ahora.');
    const activateConfirmation = page.getByRole('dialog', { name: '¿Continuar con la acción sensible?' });
    await expect(activateConfirmation).toBeVisible({ timeout: 30_000 });
    await activateConfirmation.getByRole('button', { name: 'Continuar' }).click();
    await expect.poll(async () => (await currentPlan(page))?.status, { timeout: 120_000 }).toBe('active');

    // 5) Start and complete a real guided session with exact metrics.
    await replaceConversation(page, {
      id: 'conversation-live-physio-session',
      draftId: 'draft-live-physio-session',
      intent: 'summarize_sessions',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: createdPlan.id,
    });
    await send(page, 'Inicia una sesión guiada para este paciente con este plan, dolor inicial 5, energía 7 y comentario “Inicio flujo fisioterapeuta QA”. Hazlo ahora.');
    await expect.poll(async () => {
      const state = await readStore(page);
      return {
        starts: successfulToolCount(state, 'session.start_or_resume'),
        startedEvents: state.events.filter((event) => event.kind === 'session_started' && event.patientId === 'patient-e2e' && event.planId === createdPlan.id).length,
      };
    }, { timeout: 120_000 }).toEqual({ starts: 1, startedEvents: 1 });

    // session.start_or_resume intentionally opens the guided-session surface. Return to the same
    // assistant conversation before asking Atal to complete it; this mirrors the real navigation flow.
    await page.goto('/assistant');
    await expect(page.getByLabel('Mensaje para Atal IA')).toBeVisible({ timeout: 20_000 });
    await send(page, 'Completa la sesión con dolor final 3, energía final 6, esfuerzo 5 y comentario “Buena tolerancia sin aumento del dolor”. Hazlo ahora.');
    const sensitiveConfirmation = page.getByRole('dialog', { name: '¿Continuar con la acción sensible?' });
    await expect(sensitiveConfirmation).toBeVisible({ timeout: 30_000 });
    await sensitiveConfirmation.getByRole('button', { name: 'Continuar' }).click();

    await expect.poll(async () => {
      const session = await currentGeneratedSession(page, createdPlan.id);
      const state = await readStore(page);
      return {
        status: session?.status,
        endPain: session?.endPain,
        endEnergy: session?.endEnergy,
        effort: session?.effort,
        comment: session?.comment,
        completes: successfulToolCount(state, 'session.complete'),
      };
    }, { timeout: 120_000 }).toMatchObject({
      status: 'completed',
      endPain: 3,
      endEnergy: 6,
      effort: 5,
      comment: 'Buena tolerancia sin aumento del dolor',
      completes: 1,
    });

    const generatedSession = await currentGeneratedSession(page, createdPlan.id);
    expect(generatedSession).toBeTruthy();

    // 6) Read the real recent session and then review its report through Gemini.
    await replaceConversation(page, {
      id: 'conversation-live-physio-report',
      draftId: 'draft-live-physio-report',
      intent: 'create_report',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: createdPlan.id,
    });
    await send(page, 'Resúmeme la última sesión completada de este paciente usando únicamente lo guardado en Atal.');
    await waitForSettledAgent(page);
    const lastAssistant = page.locator('.atal-command-message.is-assistant').last();
    await expect(lastAssistant).toContainText(/3|dolor/i, { timeout: 120_000 });
    await expect(lastAssistant).toContainText(/5|esfuerzo/i);

    await send(page, 'Revisa el reporte de la última sesión completada y guarda esta observación clínica: “Buena tolerancia; continuar progresión gradual”. Hazlo ahora.');
    await expect.poll(async () => {
      const state = await readStore(page);
      const session = state.sessions.find((item) => item.id === generatedSession.id);
      return {
        observation: session?.clinicalObservation,
        reviewedAt: session?.reviewedAt,
        reportAudits: successfulToolCount(state, 'report.review'),
      };
    }, { timeout: 120_000 }).toMatchObject({
      observation: 'Buena tolerancia; continuar progresión gradual',
      reviewedAt: expect.any(String),
      reportAudits: 1,
    });

    // 7) Real mutation + visible Undo must restore the canonical patient value.
    await replaceConversation(page, {
      id: 'conversation-live-physio-undo',
      draftId: 'draft-live-physio-undo',
      intent: 'update_patient_record',
      patientMode: 'existing',
      selectedPatientId: 'patient-e2e',
      selectedPlanId: createdPlan.id,
    });
    await send(page, 'Cambia el teléfono de este paciente a 4443334455. Hazlo ahora.');
    await expect.poll(async () => (await readStore(page)).patients.find((patient) => patient.id === 'patient-e2e')?.contact?.phone, { timeout: 120_000 }).toBe('4443334455');
    const undo = page.getByRole('button', { name: /Deshacer último cambio/i });
    await expect(undo).toBeVisible({ timeout: 30_000 });
    await undo.click();
    await expect.poll(async () => (await readStore(page)).patients.find((patient) => patient.id === 'patient-e2e')?.contact?.phone, { timeout: 30_000 }).toBe('4440000000');

    // 8) Hard reload and exact canonical sanity across every stage.
    await page.reload();
    await expect.poll(async () => {
      const state = await readStore(page);
      const plan = state.plans.find((item) => item.id === createdPlan.id);
      const exercise = state.exercises.find((item) => item.id === 'exercise-strength-physio-live');
      const record = state.clinicalRecords.find((item) => item.patientId === 'patient-e2e');
      const session = state.sessions.find((item) => item.id === generatedSession.id);
      return {
        phone: state.patients.find((item) => item.id === 'patient-e2e')?.contact?.phone,
        painLevel: record?.painLevel,
        planStatus: plan?.status,
        frequency: plan?.frequency,
        exerciseIds: plan?.exerciseIds ?? [],
        exerciseSets: exercise?.sets,
        exerciseRepetitions: exercise?.repetitions,
        exerciseInstructions: exercise?.instructions,
        sessionStatus: session?.status,
        endPain: session?.endPain,
        effort: session?.effort,
        observation: session?.clinicalObservation,
      };
    }, { timeout: 30_000 }).toMatchObject({
      phone: '4440000000',
      painLevel: 6,
      planStatus: 'active',
      frequency: '4 veces por semana',
      exerciseIds: expect.arrayContaining(['exercise-e2e', 'exercise-strength-physio-live']),
      exerciseSets: 4,
      exerciseRepetitions: 10,
      exerciseInstructions: ['Mantén el codo junto al cuerpo'],
      sessionStatus: 'completed',
      endPain: 3,
      effort: 5,
      observation: 'Buena tolerancia; continuar progresión gradual',
    });

    await expect(page.locator('body')).not.toContainText('EMPTY_MODEL_TURN');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});