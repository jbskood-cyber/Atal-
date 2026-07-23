import { readFileSync, writeFileSync } from 'node:fs';

function replaceBetween(source, start, end, replacement) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Start marker not found: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`End marker not found: ${end}`);
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
}

const criticalPath = 'e2e/block-4-1-critical.spec.mjs';
let critical = readFileSync(criticalPath, 'utf8');

const sendMarker = `async function sendMessage(page, text) {
  await page.getByLabel('Mensaje para Atal IA').fill(text);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
}
`;
const agentHelpers = `${sendMarker}
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
`;
if (!critical.includes('async function mockAgent(page, turns)')) {
  if (!critical.includes(sendMarker)) throw new Error('sendMessage helper not found.');
  critical = critical.replace(sendMarker, agentHelpers);
}

critical = replaceBetween(
  critical,
  `  test('Atal AI patient summary is read-only for the clinical store', async ({ page }) => {`,
  `  test('reversible AI note requires confirmation, audits safely and undoes exactly', async ({ page }) => {`,
  `  test('Atal AI patient summary is read-only for the clinical store', async ({ page }) => {
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

    await expect(page.getByText(/Plan activo: Plan activo E2E\./)).toBeVisible();
    const after = await readStore(page);
    expect(after).toEqual(before);
  });

`,
);

critical = replaceBetween(
  critical,
  `  test('reversible AI note requires confirmation, audits safely and undoes exactly', async ({ page }) => {`,
  `  test('sensitive plan activation cancels without mutation and confirms only the target plan', async ({ page }) => {`,
  `  test('explicit reversible AI note executes immediately, audits safely and undoes exactly', async ({ page }) => {
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

`,
);

critical = replaceBetween(
  critical,
  `  test('sensitive plan activation cancels without mutation and confirms only the target plan', async ({ page }) => {`,
  `  test('normalized duplicate patient proposal surfaces an exact-choice clarification with zero mutation', async ({ page }) => {`,
  `  test('sensitive plan activation cancels without mutation and confirms only the target plan', async ({ page }) => {
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

`,
);

critical = replaceBetween(
  critical,
  `  test('normalized duplicate patient proposal surfaces an exact-choice clarification with zero mutation', async ({ page }) => {`,
  `  test('stale patient draft is blocked after a newer manual version appears', async ({ page }) => {`,
  `  test('normalized duplicate patient request produces one actionable clarification with zero mutation', async ({ page }) => {
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

`,
);

critical = replaceBetween(
  critical,
  `  test('stale patient draft is blocked after a newer manual version appears', async ({ page }) => {`,
  `  test('390px smoke preserves essential routes, themes and fatal-error-free rendering', async ({ page }) => {`,
  `  test('pending sensitive action is blocked after a newer manual state appears', async ({ page }) => {
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
    await expect(page.getByText(/El plan no puede pasar de archived a active\./)).toBeVisible();

    const stored = await readStore(page);
    expect(stored.plans.find((plan) => plan.id === 'plan-draft-e2e').status).toBe('archived');
    expect(stored.events.some((event) => event.toolName === 'plan.activate' && event.outcome === 'success')).toBe(false);
  });

`,
);

writeFileSync(criticalPath, critical, 'utf8');

const agenticPath = 'e2e/block-4-3-agentic.spec.mjs';
let agentic = readFileSync(agenticPath, 'utf8');
const oldOpen = `async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState() });
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: '¿Qué necesitas resolver?' })).toBeVisible();
}`;
const newOpen = `async function openAssistant(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.clear();
    localStorage.setItem('atal:store:v2', JSON.stringify(state));
    localStorage.setItem('atal:ai-conversations:v1', '[]');
    localStorage.setItem('atal:ai-drafts:v1', '[]');
    localStorage.setItem('atal:theme', 'light');
  }, createState());
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: '¿Qué necesitas resolver?' })).toBeVisible();
}`;
if (!agentic.includes(oldOpen)) throw new Error('Agentic openAssistant helper not found.');
agentic = agentic.replace(oldOpen, newOpen);
writeFileSync(agenticPath, agentic, 'utf8');

const patientToolsPath = 'src/features/atal-ai/core/tools/universalPatientTools.ts';
let patientTools = readFileSync(patientToolsPath, 'utf8');
const oldDuplicate = `      if (environment.state.patients.some((item) => normalizeEntityLabel(item.name) === normalized)) {
        throw coreError('CORE_ENTITY_AMBIGUOUS', 'Ya existe un paciente con ese nombre.');
      }`;
const newDuplicate = `      const existing = environment.state.patients.find((item) => normalizeEntityLabel(item.name) === normalized);
      if (existing) {
        throw coreError('CORE_ENTITY_AMBIGUOUS', \`Ya existe el paciente “\${existing.name}”. Usa ese expediente o indica un nombre distinto para crear otro.\`);
      }`;
if (!patientTools.includes(oldDuplicate)) throw new Error('Duplicate patient precondition not found.');
patientTools = patientTools.replace(oldDuplicate, newDuplicate);
writeFileSync(patientToolsPath, patientTools, 'utf8');

console.log('Migrated Block 4.1 and 4.3 E2E tests to the universal agent contract.');
