import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('defaults to a simple accessible plan and supports 1 to 99 rehabilitation sessions',()=>{
  const options=read('src/features/patient-delivery/deliveryOptions.ts');
  assert.match(options,/mode: 'simple'/);
  assert.match(options,/sessionCount: 8/);
  assert.match(options,/Math\.min\(99, Math\.max\(1/);
  assert.doesNotMatch(options,/week|semana/i);
  assert.match(options,/simpleExerciseRowsPerPage/);
  assert.match(options,/extra-large' \? 3 : 4/);
});

test('normalizes optional exercises and always keeps one useful tracking field',()=>{
  const options=read('src/features/patient-delivery/deliveryOptions.ts');
  assert.match(options,/perExerciseCompletion: includeExercises &&/);
  assert.match(options,/if \(!Object\.values\(logFields\)\.some\(Boolean\)\) logFields\.overallCompletion = true/);
  assert.match(options,/includeRest = includeExercises &&/);
  assert.match(options,/includeImages = mode === 'detailed'/);
});

test('renders a large-type simple plan without forcing all exercises onto one page',()=>{
  const renderer=read('src/features/patient-delivery/pdfSimpleRenderer.ts');
  assert.match(renderer,/fontScale === 'extra-large' \? 16 : 14/);
  assert.match(renderer,/PLAN SIMPLE DE FISIOTERAPIA/);
  assert.match(renderer,/options\.includeExercises \? documentModel\.exercises : \[\]/);
  assert.match(renderer,/simpleExerciseRowsPerPage/);
  assert.match(renderer,/Math\.ceil\(Math\.max\(1, exercises\.length\) \/ capacity\)/);
  assert.match(renderer,/series.*repeticiones/s);
});

test('creates a flexible numbered rehabilitation log instead of a weekly form',()=>{
  const renderer=read('src/features/patient-delivery/pdfSessionLogRenderer.ts');
  assert.match(renderer,/REGISTRO DE REHABILITACIÓN/);
  assert.match(renderer,/SESIÓN \$\{sessionNumber\}/);
  assert.match(renderer,/options\.sessionCount/);
  assert.doesNotMatch(renderer,/semana|weekly/i);
  assert.match(renderer,/Rutina completada/);
  assert.match(renderer,/Ejercicios realizados/);
  assert.match(renderer,/Dolor antes/);
  assert.match(renderer,/Dolor después/);
  assert.match(renderer,/Dificultad percibida/);
  assert.match(renderer,/Observaciones/);
});

test('shares deterministic page capacities between estimation and session rendering',()=>{
  const options=read('src/features/patient-delivery/deliveryOptions.ts');
  const renderer=read('src/features/patient-delivery/pdfSessionLogRenderer.ts');
  assert.match(options,/patientSessionPageCapacities/);
  assert.match(options,/continuationAvailable = 620/);
  assert.match(options,/sessionsPerFirstPage/);
  assert.match(renderer,/patientSessionPageCapacities\(documentModel, options\)/);
  assert.match(renderer,/estimatePatientPlanPages\(documentModel, options\)/);
  assert.match(renderer,/drawSessionCard/);
});

test('routes simple, session-log and detailed documents without changing clinical data',()=>{
  const router=read('src/features/patient-delivery/pdfRouter.ts');
  const types=read('src/features/patient-delivery/types.ts');
  assert.match(types,/PatientPlanDocumentMode = 'simple' \| 'session-log' \| 'detailed'/);
  assert.match(router,/renderSimplePatientPlanPdf/);
  assert.match(router,/renderPatientSessionLogPdf/);
  assert.match(router,/createDetailedPatientPlanPdf/);
  assert.match(router,/options\.includeImages \? resolvedMedia : \[\]/);
});

test('replaces the long preview with a compact session-based configurator',()=>{
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  assert.match(screen,/Plan simple/);
  assert.match(screen,/Registro de sesiones/);
  assert.match(screen,/Plan detallado/);
  assert.match(screen,/Cantidad de sesiones/);
  assert.match(screen,/De 1 a 99/);
  assert.match(screen,/Casilla general de rutina completada/);
  assert.match(screen,/Casillas por ejercicio/);
  assert.match(screen,/estimatePatientPlanPages/);
  assert.doesNotMatch(screen,/atal-delivery-document|previewImages|mediaLoading/);
});

test('loads multimedia only for an explicitly selected detailed document',()=>{
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  assert.match(screen,/normalizedOptions\.mode === 'detailed' && normalizedOptions\.includeImages/);
  assert.match(screen,/resolvePatientPlanMedia\(documentModel\)/);
  assert.match(screen,/createPatientPlanPdf\(documentModel, resolvedMedia, normalizedOptions\)/);
});

test('prints the generated PDF and preserves the isolated Atal visual system',()=>{
  const actions=read('src/features/patient-delivery/deliveryActions.ts');
  const styles=read('src/styles/atal-patient-delivery.css');
  const main=read('src/main.tsx');
  assert.match(actions,/printPatientPlanPdf/);
  assert.match(actions,/patientPlanPdfBlob\(result\)/);
  assert.match(actions,/document\.createElement\('iframe'\)/);
  assert.match(actions,/window\.open\(url, '_blank'/);
  assert.doesNotMatch(actions,/export function printPatientPlan\(\).*window\.print/s);
  assert.match(styles,/#7eb695/i);
  assert.doesNotMatch(styles,/linear-gradient|radial-gradient/);
  assert.match(styles,/@media print/);
  assert.doesNotMatch(main,/atal-patient-delivery\.css/);
});
