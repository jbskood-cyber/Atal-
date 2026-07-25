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

test.describe('Behavior System Phase 6 — patient browser parity', () => {
  test('new patient UI rejects accent-normalized duplicate without mutating store', async ({ page }) => {
    const state = createState();
    state.patients[0] = { ...state.patients[0], name: 'Jose QA' };
    await seedBrowser(page, { state });

    await page.goto('/patients/new');
    const before = await readStore(page);

    await page.getByLabel('Nombre completo').fill('José QA');
    await page.getByLabel('Motivo / diagnóstico').fill('Prueba de duplicado normalizado');
    await page.getByRole('button', { name: /Guardar paciente/ }).click();

    await expect(page.getByRole('alert')).toContainText('Ya existe el paciente “Jose QA”');
    await expect(page).toHaveURL(/\/patients\/new$/);

    const after = await readStore(page);
    expect(after.patients).toEqual(before.patients);
    expect(after.clinicalRecords).toEqual(before.clinicalRecords);
  });

  test('new patient UI creates patient + initial record atomically through canonical transaction', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/patients/new');

    await page.getByLabel('Nombre completo').fill('Paciente Browser Nuevo');
    await page.getByLabel('WhatsApp').fill('4441234567');
    await page.getByLabel('Edad').fill('32');
    await page.getByLabel('Motivo / diagnóstico').fill('Dolor lumbar mecánico');
    await page.getByLabel('Notas clínicas').fill('Evaluación inicial creada desde la UI.');
    await page.getByRole('button', { name: /Guardar paciente/ }).click();

    await expect(page).toHaveURL(/\/patients\/[^/]+$/);
    const after = await readStore(page);
    const patient = after.patients.find((item) => item.name === 'Paciente Browser Nuevo');
    expect(patient).toBeTruthy();
    expect(patient.contact.phone).toBe('4441234567');
    expect(patient.age).toBe(32);

    const record = after.clinicalRecords.find((item) => item.patientId === patient.id);
    expect(record).toBeTruthy();
    expect(record.reasonForVisit).toBe('Dolor lumbar mecánico');
    expect(record.clinicalNotes).toBe('Evaluación inicial creada desde la UI.');

    const audit = after.events.find((event) => event.kind === 'action_applied' && event.intent === 'patient.create' && event.entityId === patient.id);
    expect(audit).toBeTruthy();
    expect(audit.origin).toBe('manual');
    expect(audit.transactionId).toBeTruthy();
    expect(audit.affectedEntities).toEqual(expect.arrayContaining([
      { type: 'patient', id: patient.id },
      { type: 'clinical-record', id: record.id },
    ]));
  });

  test('patient archive and restore UI preserves shared lifecycle semantics', async ({ page }) => {
    const state = createState();
    const activePlan = state.plans.find((plan) => plan.patientId === 'patient-e2e' && plan.status === 'active');
    expect(activePlan).toBeTruthy();
    await seedBrowser(page, { state });

    await page.goto('/patients/patient-e2e');
    await page.getByRole('button', { name: 'Archivar paciente' }).click();

    let after = await readStore(page);
    expect(after.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('archived');
    expect(after.plans.find((item) => item.id === activePlan.id)?.status).toBe('paused');
    expect(after.events.some((event) => event.kind === 'patient_archived' && event.patientId === 'patient-e2e')).toBe(true);
    expect(after.events.some((event) => event.kind === 'plan_paused' && event.planId === activePlan.id)).toBe(true);

    await page.getByRole('button', { name: 'Restaurar paciente' }).click();
    after = await readStore(page);
    expect(after.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('active');
    expect(after.plans.find((item) => item.id === activePlan.id)?.status).toBe('paused');
    expect(after.events.some((event) => event.kind === 'patient_restored' && event.patientId === 'patient-e2e')).toBe(true);
  });

  test('Atal IA creates patient + record with audited canonical transaction', async ({ page }) => {
    const conversation = createConversation({ intent: 'create_patient_plan', patientMode: 'new', selectedPatientId: '' });
    await seedBrowser(page, { state: createState(), conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('create-patient', 'atal_action'),
        calls: [{
          id: 'create-patient',
          bridge: 'atal_action',
          tool: 'patient.create',
          input: {
            patient: { name: 'Paciente IA Nuevo', diagnosis: 'Dolor de hombro', affectedArea: 'Hombro' },
            record: { reasonForVisit: 'Dolor de hombro', goals: ['Recuperar movilidad'] },
          },
          references: [],
        }],
      },
      {
        text: 'Listo. Registré al paciente y su expediente inicial.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');
    await sendMessage(page, 'Registra un paciente nuevo con dolor de hombro.');
    await expect(page.getByText('Listo. Registré al paciente y su expediente inicial.')).toBeVisible();

    const after = await readStore(page);
    const patient = after.patients.find((item) => item.name === 'Paciente IA Nuevo');
    expect(patient).toBeTruthy();
    const record = after.clinicalRecords.find((item) => item.patientId === patient.id);
    expect(record).toBeTruthy();
    const audit = after.events.find((event) => event.toolName === 'patient.create' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.transactionId).toBeTruthy();
    expect(audit.affectedEntities).toEqual(expect.arrayContaining([
      { type: 'patient', id: patient.id },
      { type: 'clinical-record', id: record.id },
    ]));
  });

  test('Atal IA updates patient through canonical reversible write', async ({ page }) => {
    const conversation = createConversation({ intent: 'update_patient', selectedPatientId: 'patient-e2e' });
    await seedBrowser(page, { state: createState(), conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('update-patient', 'atal_action'),
        calls: [{
          id: 'update-patient',
          bridge: 'atal_action',
          tool: 'patient.update',
          input: { patient: { type: 'patient', id: 'patient-e2e' }, patch: { diagnosis: 'Diagnóstico actualizado por IA' } },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Actualicé los datos del paciente.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');
    await sendMessage(page, 'Actualiza el diagnóstico del paciente seleccionado.');
    await expect(page.getByText('Listo. Actualicé los datos del paciente.')).toBeVisible();

    const after = await readStore(page);
    expect(after.patients.find((item) => item.id === 'patient-e2e')?.diagnosis).toBe('Diagnóstico actualizado por IA');
    const audit = after.events.find((event) => event.toolName === 'patient.update' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.affectedEntities).toEqual([{ type: 'patient', id: 'patient-e2e' }]);
  });

  test('Atal IA archives patient only after confirmation and pauses active plan', async ({ page }) => {
    const state = createState();
    const activePlan = state.plans.find((plan) => plan.patientId === 'patient-e2e' && plan.status === 'active');
    expect(activePlan).toBeTruthy();
    const conversation = createConversation({ intent: 'archive_patient', selectedPatientId: 'patient-e2e' });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('archive-patient', 'atal_action'),
        calls: [{
          id: 'archive-patient',
          bridge: 'atal_action',
          tool: 'patient.lifecycle',
          input: { patient: { type: 'patient', id: 'patient-e2e' }, archived: true },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Archivé al paciente y pausé su plan activo.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);
    await page.goto('/assistant');
    await sendMessage(page, 'Archiva al paciente seleccionado.');
    await expect(page.getByText('Confirmación necesaria')).toBeVisible();

    let stored = await readStore(page);
    expect(stored.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('active');
    expect(stored.plans.find((item) => item.id === activePlan.id)?.status).toBe('active');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Listo. Archivé al paciente y pausé su plan activo.')).toBeVisible();
    stored = await readStore(page);
    expect(stored.patients.find((item) => item.id === 'patient-e2e')?.status).toBe('archived');
    expect(stored.plans.find((item) => item.id === activePlan.id)?.status).toBe('paused');
    expect(stored.events.some((event) => event.kind === 'patient_archived' && event.patientId === 'patient-e2e')).toBe(true);
    expect(stored.events.some((event) => event.kind === 'plan_paused' && event.planId === activePlan.id)).toBe(true);
    expect(stored.events.some((event) => event.toolName === 'patient.lifecycle' && event.outcome === 'success')).toBe(true);
  });

  test('Atal IA versions and updates clinical record through canonical reversible write', async ({ page }) => {
    const state = createState();
    const beforeRecord = structuredClone(state.clinicalRecords.find((item) => item.patientId === 'patient-e2e'));
    expect(beforeRecord).toBeTruthy();
    const beforeVersionCount = state.clinicalRecordVersions.filter((item) => item.recordId === beforeRecord.id).length;
    const conversation = createConversation({ intent: 'update_clinical_record', selectedPatientId: 'patient-e2e' });
    await seedBrowser(page, { state, conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('update-record', 'atal_action'),
        calls: [{
          id: 'update-record',
          bridge: 'atal_action',
          tool: 'clinical_record.upsert',
          input: {
            patient: { type: 'patient', id: 'patient-e2e' },
            patch: { clinicalNotes: 'Nota clínica actualizada por IA', painLevel: 4 },
          },
          references: [{ type: 'patient', id: 'patient-e2e' }],
        }],
      },
      {
        text: 'Listo. Actualicé el expediente clínico.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Actualiza el expediente clínico del paciente seleccionado.');
    await expect(page.getByText('Listo. Actualicé el expediente clínico.')).toBeVisible();

    const after = await readStore(page);
    const record = after.clinicalRecords.find((item) => item.id === beforeRecord.id);
    expect(record).toBeTruthy();
    expect(record.clinicalNotes).toBe('Nota clínica actualizada por IA');
    expect(record.painLevel).toBe(4);
    expect(record.version).toBe(beforeRecord.version + 1);

    const versions = after.clinicalRecordVersions.filter((item) => item.recordId === beforeRecord.id);
    expect(versions).toHaveLength(beforeVersionCount + 1);
    const snapshot = versions.at(-1)?.snapshot;
    expect(snapshot?.version).toBe(beforeRecord.version);
    expect(snapshot?.clinicalNotes).toBe(beforeRecord.clinicalNotes);

    const audit = after.events.find((event) => event.toolName === 'clinical_record.upsert' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
    expect(audit.affectedEntities).toEqual([{ type: 'clinical-record', id: record.id }]);
  });
});
