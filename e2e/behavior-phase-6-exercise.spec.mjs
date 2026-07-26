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

test.describe('Behavior System Phase 6 — exercise parity', () => {
  test('direct UI creates an exercise through the real local builder', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/exercises/new');

    await page.getByLabel('Nombre').fill('Ejercicio UI Phase 6');
    await page.getByLabel('Instrucciones').fill('Mover con control\nDetenerse ante dolor alto');
    await page.getByRole('button', { name: 'Guardar ejercicio local' }).click();

    await expect(page).toHaveURL(/\/exercises\/[^/]+$/);
    const after = await readStore(page);
    const exercise = after.exercises.find((item) => item.name === 'Ejercicio UI Phase 6');
    expect(exercise).toBeTruthy();
    expect(exercise.status).toBe('active');
    expect(exercise.source).toBe('local');
    expect(exercise.instructions).toEqual(['Mover con control', 'Detenerse ante dolor alto']);
  });

  test('direct UI edits and archives the exercise through the real detail screen', async ({ page }) => {
    await seedBrowser(page, { state: createState() });
    await page.goto('/exercises/exercise-e2e');

    await page.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('button', { name: /Editar ejercicio/ }).click();
    await page.getByLabel('Series').fill('4');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();

    let after = await readStore(page);
    expect(after.exercises.find((item) => item.id === 'exercise-e2e')?.sets).toBe(4);

    await page.getByRole('button', { name: 'Archivar' }).first().click();
    await expect(page.getByText('Ejercicio archivado.')).toBeVisible();
    after = await readStore(page);
    expect(after.exercises.find((item) => item.id === 'exercise-e2e')?.status).toBe('archived');
  });

  test('Atal IA creates an exercise through the canonical audited tool', async ({ page }) => {
    const conversation = createConversation({ selectedPatientId: '', selectedExerciseId: '' });
    await seedBrowser(page, { state: createState(), conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('create-exercise', 'atal_action'),
        calls: [{
          id: 'create-exercise',
          bridge: 'atal_action',
          tool: 'exercise.create_simple',
          input: {
            name: 'Ejercicio IA Phase 6',
            region: 'Hombro',
            category: 'Control motor',
            objective: 'Mejorar control escapular',
            startingPosition: 'Sentado',
            instructions: ['Elevar con control', 'Volver lentamente'],
            precautions: 'Detener ante dolor alto',
            equipment: 'Ninguno',
            difficulty: 'Inicial',
            sets: 3,
            repetitions: 8,
            rest: '30 segundos',
            maxPain: 4,
            tags: ['hombro'],
            notes: '',
          },
          references: [],
        }],
      },
      {
        text: 'Listo. Registré la rutina.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Registra en la biblioteca la rutina que te indico.');
    await expect(page.getByText('Listo. Registré la rutina.')).toBeVisible();

    const after = await readStore(page);
    const exercise = after.exercises.find((item) => item.name === 'Ejercicio IA Phase 6');
    expect(exercise).toBeTruthy();
    expect(exercise.status).toBe('active');
    const audit = after.events.find((event) => event.toolName === 'exercise.create_simple' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();
  });

  test('Atal IA updates and archives the selected exercise through canonical tools', async ({ page }) => {
    const conversation = createConversation({
      intent: 'update_exercise',
      selectedPatientId: '',
      selectedExerciseId: 'exercise-e2e',
    });
    await seedBrowser(page, { state: createState(), conversations: [conversation] });
    await mockAgent(page, [
      {
        text: '',
        modelContent: agentModelContent('update-exercise', 'atal_action'),
        calls: [{
          id: 'update-exercise',
          bridge: 'atal_action',
          tool: 'exercise.update_fields',
          input: {
            exercise: { type: 'exercise', id: 'exercise-e2e' },
            patch: { sets: 4, notes: 'Ajuste Phase 6' },
          },
          references: [{ type: 'exercise', id: 'exercise-e2e' }],
        }],
      },
      {
        text: 'Listo. Ajusté el ejercicio.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
      {
        text: '',
        modelContent: agentModelContent('archive-exercise', 'atal_action'),
        calls: [{
          id: 'archive-exercise',
          bridge: 'atal_action',
          tool: 'exercise.lifecycle',
          input: {
            exercise: { type: 'exercise', id: 'exercise-e2e' },
            archived: true,
          },
          references: [{ type: 'exercise', id: 'exercise-e2e' }],
        }],
      },
      {
        text: 'Listo. Archivé el ejercicio.',
        modelContent: { role: 'model', parts: [{ text: 'Listo.' }] },
        calls: [],
      },
    ]);

    await page.goto('/assistant');
    await sendMessage(page, 'Ajusta a 4 series el ejercicio seleccionado.');
    await expect(page.getByText('Listo. Ajusté el ejercicio.')).toBeVisible();

    let after = await readStore(page);
    let exercise = after.exercises.find((item) => item.id === 'exercise-e2e');
    expect(exercise?.sets).toBe(4);
    expect(exercise?.notes).toBe('Ajuste Phase 6');
    let audit = after.events.find((event) => event.toolName === 'exercise.update_fields' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.riskLevel).toBe('reversible-write');
    expect(audit.transactionId).toBeTruthy();

    await sendMessage(page, 'Archiva el ejercicio seleccionado.');
    await expect(page.getByText('Listo. Archivé el ejercicio.')).toBeVisible();

    after = await readStore(page);
    exercise = after.exercises.find((item) => item.id === 'exercise-e2e');
    expect(exercise?.status).toBe('archived');
    audit = after.events.find((event) => event.toolName === 'exercise.lifecycle' && event.outcome === 'success');
    expect(audit).toBeTruthy();
    expect(audit.transactionId).toBeTruthy();
  });
});
