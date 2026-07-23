import { expect, test } from '@playwright/test';
import {
  commandFixture,
  createDraftResponse,
  createState,
  mockAnalyze,
  readStore,
  seedBrowser,
} from './fixtures.mjs';

const patientPath = '/patients/patient-e2e';

async function openPatient(page, options = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState(), ...options });
  await page.goto(patientPath);
  await expect(page.getByRole('heading', { name: 'Paciente E2E' })).toBeVisible();
}

async function openWorkspace(page) {
  await page.getByRole('button', { name: 'Abrir Atal IA en este paciente' }).click();
  return page.getByRole('dialog', { name: 'Asistente en este paciente' });
}

test.describe('Block 4.2 contextual patient workspace', () => {
  test('closed state shows bottom navigation orb and compact patient actions', async ({ page }) => {
    await openPatient(page);
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar contacto con Atal IA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver progreso con Atal IA' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toBeVisible();
  });

  test('opening keeps route and hides the complete navigation orb and exterior actions', async ({ page }) => {
    await openPatient(page);
    const before = new URL(page.url()).pathname;
    await openWorkspace(page);
    expect(new URL(page.url()).pathname).toBe(before);
    await expect(page.locator('.atal-mobile-dock')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Actualizar contacto con Atal IA' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver progreso con Atal IA' })).toHaveCount(0);
    await expect(page.locator('[data-contextual-ai-background]')).toHaveAttribute('inert', '');
  });

  test('minimize restores the exact route scroll navigation and contextual trigger', async ({ page }) => {
    await openPatient(page);
    await page.evaluate(() => window.scrollTo(0, Math.min(360, document.documentElement.scrollHeight - window.innerHeight)));
    const expectedScroll = await page.evaluate(() => window.scrollY);
    const expectedUrl = page.url();
    await openWorkspace(page);
    await page.getByRole('button', { name: 'Minimizar asistente' }).click();
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir Atal IA en este paciente' })).toBeFocused();
    expect(page.url()).toBe(expectedUrl);
    await expect.poll(() => page.evaluate((expected) => Math.abs(window.scrollY - expected), expectedScroll)).toBeLessThanOrEqual(1);
  });

  test('close restores the screen and reopening recovers the same contextual conversation', async ({ page }) => {
    await openPatient(page);
    let workspace = await openWorkspace(page);
    const conversationId = await workspace.getAttribute('data-conversation-id');
    expect(conversationId).toBeTruthy();
    await page.getByRole('button', { name: 'Cerrar asistente' }).click();
    await expect(page.locator('.atal-mobile-dock')).toBeVisible();
    workspace = await openWorkspace(page);
    await expect(workspace).toHaveAttribute('data-conversation-id', conversationId);
  });

  test('contextual patient summary is read-only and remains inside the current route', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedBrowser(page, { state: createState() });
    await mockAnalyze(page, createDraftResponse({
      intent: 'summarize_patient',
      responseMode: 'query',
      command: commandFixture('summarize_patient', { patientId: 'patient-e2e' }),
    }));
    await page.goto(patientPath);
    const before = await readStore(page);
    const url = page.url();
    const workspace = await openWorkspace(page);
    await workspace.getByLabel('Mensaje para Atal IA contextual').fill('Resume al paciente seleccionado.');
    await workspace.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(workspace.getByText(/Plan activo: Plan activo E2E\./)).toBeVisible();
    expect(page.url()).toBe(url);
    expect(await readStore(page)).toEqual(before);
  });

  test('contextual reversible note prepares first then confirms audits and undoes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedBrowser(page, { state: createState() });
    await mockAnalyze(page, createDraftResponse({
      intent: 'add_patient_note',
      responseMode: 'command',
      assistantMessage: 'Añadir una nota clínica demostrativa.',
      command: commandFixture('add_patient_note', {
        patientId: 'patient-e2e',
        content: 'Nota contextual E2E reversible.',
      }),
    }));
    await page.goto(patientPath);
    const workspace = await openWorkspace(page);
    await workspace.getByRole('button', { name: 'Crear nota' }).click();
    await workspace.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(workspace.getByRole('button', { name: 'Aplicar cambios' })).toBeVisible();
    expect((await readStore(page)).notes).toHaveLength(0);

    await workspace.getByRole('button', { name: 'Aplicar cambios' }).click();
    let dialog = page.getByRole('dialog', { name: /Aplicar esta acción/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    expect((await readStore(page)).notes).toHaveLength(0);

    await workspace.getByRole('button', { name: 'Aplicar cambios' }).click();
    dialog = page.getByRole('dialog', { name: /Aplicar esta acción/ });
    await dialog.getByRole('button', { name: 'Confirmar y aplicar' }).click();
    await expect(workspace.getByText('Cambios aplicados', { exact: true })).toBeVisible();
    let stored = await readStore(page);
    expect(stored.notes).toHaveLength(1);
    expect(stored.notes[0].content).toBe('Nota contextual E2E reversible.');
    expect(stored.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'success')).toBe(true);

    await workspace.getByRole('button', { name: 'Deshacer cambio' }).click();
    await expect(workspace.getByText('Cambio deshecho correctamente.')).toBeVisible();
    stored = await readStore(page);
    expect(stored.notes).toHaveLength(0);
    expect(stored.events.some((event) => event.toolName === 'patient_note.add' && event.outcome === 'undone')).toBe(true);
  });
});
