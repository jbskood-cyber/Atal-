import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('builds one canonical saved patient plan document',()=>{
  const builder=read('src/features/patient-delivery/buildPatientPlanDocument.ts');
  const types=read('src/features/patient-delivery/types.ts');
  assert.match(builder,/buildPatientPlanDocument/);
  assert.match(builder,/plan\.exerciseIds\.map/);
  assert.match(builder,/state\.settings\.professionalName/);
  assert.match(builder,/formatExerciseDose/);
  assert.match(types,/PATIENT_PLAN_DOCUMENT_VERSION/);
  assert.match(types,/generatedLocally: true/);
  assert.match(types,/publicLinkCreated: false/);
});

test('blocks unsafe delivery and labels non-active plans explicitly',()=>{
  const builder=read('src/features/patient-delivery/buildPatientPlanDocument.ts');
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  assert.match(builder,/patient\.status === 'archived'/);
  assert.match(builder,/plan\.status === 'archived'/);
  assert.match(builder,/requiresConfirmation: true/);
  assert.match(screen,/Entiendo que este plan no está activo/);
  assert.match(screen,/conservará claramente el estado/);
});

test('generates a dependency-free PDF 1.4 document with A4 pages and xref',()=>{
  const writer=read('src/features/patient-delivery/pdfWriter.ts');
  const renderer=read('src/features/patient-delivery/pdfRenderer.ts');
  assert.match(writer,/A4_WIDTH = 595\.28/);
  assert.match(writer,/A4_HEIGHT = 841\.89/);
  assert.match(writer,/0x25, 0x50, 0x44, 0x46/);
  assert.match(writer,/xref\n0/);
  assert.match(writer,/WinAnsiEncoding/);
  assert.match(renderer,/Página \$\{number\} de \$\{total\}/);
  assert.match(renderer,/createPatientPlanPdf/);
});

test('resolves media locally and never uploads clinical data',()=>{
  const media=read('src/features/patient-delivery/mediaResolver.ts');
  const spec=read('docs/superpowers/specs/2026-07-20-atal-patient-delivery-design.md');
  assert.match(media,/getExerciseMedia/);
  assert.match(media,/canvas\.toBlob/);
  assert.doesNotMatch(media,/fetch\(|XMLHttpRequest|https?:\/\//);
  assert.match(spec,/No clinical data is uploaded during generation/);
});

test('downloads and shares a real PDF file with a truthful fallback',()=>{
  const actions=read('src/features/patient-delivery/deliveryActions.ts');
  assert.match(actions,/application\/pdf/);
  assert.match(actions,/new File/);
  assert.match(actions,/navigator\.canShare/);
  assert.match(actions,/navigator\.share/);
  assert.match(actions,/downloadPatientPlanPdf\(result\)/);
  assert.match(actions,/\.pdf`/);
});

test('wires delivery from plan detail and patient portal',()=>{
  const app=read('src/AppCloseout.tsx');
  const detail=read('src/screens/PlanDetailCloseoutScreen.tsx');
  const portal=read('src/screens/PatientPortalPreviewScreen.tsx');
  assert.match(app,/path="\/plans\/:id\/delivery"/);
  assert.match(detail,/Entregar al paciente/);
  assert.match(detail,/guard\.requestNavigation/);
  assert.match(portal,/Ver y descargar plan/);
  assert.match(portal,/`\/plans\/\$\{plan\.id\}\/delivery`/);
});

test('keeps the approved visual system isolated from patient delivery styles',()=>{
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  const styles=read('src/styles/atal-patient-delivery.css');
  const main=read('src/main.tsx');
  assert.match(screen,/atal-patient-delivery\.css/);
  assert.match(styles,/#7eb695/i);
  assert.doesNotMatch(styles,/linear-gradient|radial-gradient/);
  assert.match(styles,/@media print/);
  assert.doesNotMatch(main,/atal-patient-delivery\.css/);
});
