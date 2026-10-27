import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

async function openAssistant(page, viewport={width:390,height:844}) {
  await page.setViewportSize(viewport);
  const state=createState();
  await seedBrowser(page, {state,theme:'light'});
  // Set readiness explicitly: no actual model call or secret is used.
  await page.route('**/api/atal-ai/status', route=>route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({configured:false}),
  }));
  await page.goto('/assistant');
  await expect(page.locator('[data-assistant-scope="global"]')).toBeVisible();
  return state;
}

test('mobile assistant explains unavailable provider before user submits anything', async ({page})=>{
  await openAssistant(page);
  await expect(page.getByText('Gemini aún no está conectado')).toBeVisible();
  await expect(page.getByText('¿Qué necesitas hacer hoy?')).toBeVisible();
  await expect(page.getByRole('button',{name:/Ver pacientes/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Ver reportes/})).toBeVisible();
  await expect(page.locator('.atal-command-message.is-user')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('shortcuts navigate directly or fill a prompt without sending or editing clinic data', async ({page})=>{
  const original=await openAssistant(page);
  await page.getByRole('button',{name:/Preparar un plan/}).click();
  const composer=page.getByLabel('Mensaje para Atal IA');
  await expect(composer).toContainText('preparar un plan de tratamiento');
  await expect(composer).toBeFocused();
  await expect(page.locator('.atal-command-message.is-user')).toHaveCount(0);
  expect((await readStore(page)).patients).toEqual(original.patients);
  await page.getByRole('button',{name:/Ver pacientes/}).click();
  await expect(page).toHaveURL(/\/patients$/);
});

test('context chooser starts with frequent tasks and reveals advanced actions on request', async ({page})=>{
  await openAssistant(page);
  await page.getByRole('button',{name:/Elegir tarea o paciente/}).click();
  const dialog=page.getByRole('dialog',{name:/¿En qué vamos a trabajar/});
  await expect(dialog.getByText('Acciones frecuentes')).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Crear paciente y plan'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Actualizar expediente'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Archivar plan'})).toHaveCount(0);
  const expand=dialog.getByRole('button',{name:/Ver más acciones/});
  await expect(expand).toHaveAttribute('aria-expanded','false');
  await expand.click();
  await expect(dialog.getByRole('button',{name:'Archivar plan'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Ocultar acciones adicionales'})).toHaveAttribute('aria-expanded','true');
});

test('attachment menu offers only distinct actions, no redundant scan choice', async ({page})=>{
  await openAssistant(page);
  await page.getByRole('button',{name:'Adjuntar cámara, foto, PDF o archivo'}).click();
  const dialog=page.getByRole('dialog',{name:'Opciones para adjuntar'});
  await expect(dialog.getByRole('button',{name:'Cámara'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Fotos'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:/Archivo/})).toContainText('PDF o imagen');
  await expect(dialog.getByRole('button',{name:'Escanear archivo'})).toHaveCount(0);
});

test('visual smoke: linear-inspired Atal IA entry is readable on a small mobile viewport', async ({page},info)=>{
  await openAssistant(page,{width:390,height:844});
  await expect(page.getByText('Gemini aún no está conectado')).toBeVisible();
  await info.attach('atal-ai-ease-mobile.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false);
});
