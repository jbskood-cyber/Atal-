import { expect, test } from '@playwright/test';
import { createState, readStore, seedBrowser } from './fixtures.mjs';

async function openAI(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedBrowser(page, { state: createState(), theme: 'light' });
  await page.route('**/api/atal-ai/status', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"configured":false}',
  }));
  await page.goto('/assistant');
  await expect(page.getByRole('button', { name: 'Nueva conversación' })).toBeVisible();
}

test('mobile context is a compact searchable palette, not a fullscreen wizard', async ({page}, info) => {
  await openAI(page);
  await page.getByRole('button', {name: /Elegir contexto/}).click();
  const dialog=page.getByRole('dialog',{name:'Añadir contexto'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Opcional. Puedes conversar sin seleccionar nada.')).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Crear paciente y plan'})).toBeVisible();
  const height=await dialog.locator('.atal-context-sheet').evaluate(element=>element.getBoundingClientRect().height);
  expect(height).toBeLessThan(675);
  const search=dialog.getByRole('searchbox',{name:'Buscar una acción'});
  await search.fill('Archivar');
  await expect(dialog.getByRole('button',{name:'Archivar plan'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Crear paciente y plan'})).toHaveCount(0);
  await search.fill('');
  await info.attach('atal-linear-context-compact-mobile.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await dialog.getByRole('button',{name:'Cerrar contexto'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/assistant$/);
});

test('mobile conversation menu is compact, retains save/history and new conversation', async ({page}, info) => {
  await openAI(page);
  await page.getByRole('button',{name:'Acciones de la conversación'}).click();
  const menu=page.getByRole('menu');
  await expect(menu.getByRole('menuitem',{name:'Historial'})).toBeVisible();
  await expect(menu.getByRole('menuitem',{name:'Guardar borrador'})).toBeVisible();
  const rect=await menu.evaluate(el=>el.getBoundingClientRect());
  expect(rect.height).toBeLessThan(330);
  expect(rect.right).toBeLessThanOrEqual(390);
  await info.attach('atal-linear-compact-menu-mobile.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await page.getByRole('button',{name:'Cerrar menú'}).click();
  await expect(page.getByRole('button',{name:'Nueva conversación'})).toBeVisible();
});

test('attachments show distinct accessible actions without overlapping PDF text', async ({page},info)=>{
  await openAI(page);
  await page.getByRole('button',{name:'Adjuntar cámara, foto, PDF o archivo'}).click();
  const dialog=page.getByRole('dialog',{name:'Opciones para adjuntar'});
  await expect(dialog.getByRole('button',{name:'Cámara'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Fotos'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Archivo PDF o imagen'})).toBeVisible();
  await expect(dialog.getByText('PDF o imagen')).toHaveCount(0);
  await info.attach('atal-linear-attachments-mobile.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});

test('provider failure is visible but not a large duplicate warning panel', async ({page})=>{
  const original=await (async()=>{await openAI(page);return readStore(page);})();
  const chip=page.getByRole('status',{name:'Estado de conexión de Atal IA'});
  await expect(chip).toContainText('Gemini aún no está conectado');
  const box=await chip.boundingBox();
  expect(box?.height).toBeLessThan(70);
  expect((await readStore(page)).patients).toEqual(original.patients);
});
