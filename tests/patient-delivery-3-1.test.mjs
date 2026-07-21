import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('defaults to one universal plan plus session log and keeps flexible session counts',()=>{
  const options=read('src/features/patient-delivery/deliveryOptions.ts');
  assert.match(options,/mode: 'plan-and-log'/);
  assert.match(options,/sessionCount: 8/);
  assert.match(options,/Math\.min\(99, Math\.max\(1/);
  assert.match(options,/plan-only/);
  assert.match(options,/log-only/);
  assert.doesNotMatch(options,/week|semana/i);
});

test('measures wrapped rows and uses the same adaptive page chunks for estimates',()=>{
  const options=read('src/features/patient-delivery/deliveryOptions.ts');
  assert.match(options,/measurePatientPlanRow/);
  assert.match(options,/measurePatientLogRow/);
  assert.match(options,/layoutPatientPlanPages/);
  assert.match(options,/layoutPatientLogPages/);
  assert.match(options,/wrapPdfText/);
  assert.match(options,/planPageCount/);
  assert.match(options,/logPagesPerSession/);
  assert.match(options,/options\.sessionCount \* logPagesPerSession/);
  assert.match(options,/plan \+ \$\{options\.sessionCount\} sesiones/);
});

test('renders a premium monochrome plan from the real prescription without fixed repetitions or series',()=>{
  const renderer=read('src/features/patient-delivery/pdfUniversalRenderer.ts');
  assert.match(renderer,/PLAN PERSONAL DE REHABILITACIÓN/);
  assert.match(renderer,/Ejercicios prescritos/);
  assert.match(renderer,/compactPatientPlanDose/);
  assert.match(renderer,/exercise\.rest/);
  assert.match(renderer,/exercise\.therapistNotes \|\| exercise\.objective/);
  assert.match(renderer,/fontScale === 'extra-large'/);
  assert.doesNotMatch(renderer,/3 × 10|3 series de 10/);
  assert.doesNotMatch(renderer,/GREEN|#7EB695|gradient/i);
});

test('uses one universal result field for repetitions time distance load laterality or tolerance',()=>{
  const renderer=read('src/features/patient-delivery/pdfUniversalRenderer.ts');
  assert.match(renderer,/REGISTRO INDIVIDUAL DE SESIÓN/);
  assert.match(renderer,/Resultado real/);
  assert.match(renderer,/Ejercicio/);
  assert.match(renderer,/Indicado/);
  assert.match(renderer,/Molestia/);
  assert.match(renderer,/10 \/ 10 \/ 8/);
  assert.match(renderer,/30 s \/ 25 s \/ 20 s/);
  assert.match(renderer,/no realizado/);
  assert.doesNotMatch(renderer,/Serie 1|Serie 2|Serie 3/);
});

test('keeps measured exercise rows complete and continues long sessions clearly',()=>{
  const renderer=read('src/features/patient-delivery/pdfUniversalRenderer.ts');
  assert.match(renderer,/layoutPatientPlanPages/);
  assert.match(renderer,/layoutPatientLogPages/);
  assert.match(renderer,/layoutPage\.rows/);
  assert.match(renderer,/SESIÓN \$\{sessionNumber\}/);
  assert.match(renderer,/CONTINUACIÓN/);
  assert.match(renderer,/sessionNumber <= options\.sessionCount/);
  assert.doesNotMatch(renderer,/slice\(start, start \+ logCapacity\)/);
});

test('includes professional finish and complete perceived-effort choices',()=>{
  const renderer=read('src/features/patient-delivery/pdfUniversalRenderer.ts');
  assert.match(renderer,/Profesional responsable/);
  assert.match(renderer,/Próxima revisión/);
  assert.match(renderer,/documentModel\.professional\.name/);
  assert.match(renderer,/Suave/);
  assert.match(renderer,/Adecuado/);
  assert.match(renderer,/Intenso/);
});

test('routes plan plus log plan only log only and the preserved detailed document',()=>{
  const router=read('src/features/patient-delivery/pdfRouter.ts');
  const types=read('src/features/patient-delivery/types.ts');
  assert.match(types,/PatientPlanDocumentMode = 'plan-and-log' \| 'plan-only' \| 'log-only' \| 'detailed'/);
  assert.match(router,/renderUniversalPatientPlanPdf/);
  assert.match(router,/createDetailedPatientPlanPdf/);
  assert.match(router,/options\.includeImages \? resolvedMedia : \[\]/);
});

test('provides a compact delivery screen without the previous wall of switches',()=>{
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  assert.match(screen,/Plan \+ registro/);
  assert.match(screen,/Solo plan/);
  assert.match(screen,/Solo registro/);
  assert.match(screen,/Sesiones a registrar/);
  assert.match(screen,/Letra grande/);
  assert.match(screen,/Letra extra grande/);
  assert.match(screen,/Opciones avanzadas/);
  assert.match(screen,/Abrir WhatsApp/);
  assert.doesNotMatch(screen,/Paso 1|Paso 2|Paso 3|Paso 4/);
  assert.doesNotMatch(screen,/Casilla general de rutina completada|Casillas por ejercicio|Dificultad percibida/);
  assert.doesNotMatch(screen,/atal-delivery-document|previewImages|mediaLoading/);
});

test('opens WhatsApp for the patient or responsible contact without claiming to attach the PDF',()=>{
  const actions=read('src/features/patient-delivery/deliveryActions.ts');
  const builder=read('src/features/patient-delivery/buildPatientPlanDocument.ts');
  assert.match(builder,/phone: patient\.contact\.phone/);
  assert.match(builder,/responsibleContact: patient\.contact\.emergencyContact/);
  assert.match(actions,/resolvePatientWhatsAppTarget/);
  assert.match(actions,/patient\.phone/);
  assert.match(actions,/patient\.responsibleContact/);
  assert.match(actions,/https:\/\/wa\.me\//);
  assert.match(actions,/adjuntaré el PDF/);
  assert.doesNotMatch(actions,/upload|WhatsApp API|sendDocument/i);
});

test('loads multimedia only for the explicit detailed option and preserves local privacy',()=>{
  const screen=read('src/screens/PatientPlanDeliveryScreen.tsx');
  assert.match(screen,/normalizedOptions\.mode === 'detailed' && normalizedOptions\.includeImages/);
  assert.match(screen,/resolvePatientPlanMedia\(documentModel\)/);
  assert.match(screen,/createPatientPlanPdf\(documentModel, resolvedMedia, normalizedOptions\)/);
  assert.match(screen,/Generación privada y local/);
});

test('prints the generated PDF and preserves the isolated Atal visual system',()=>{
  const actions=read('src/features/patient-delivery/deliveryActions.ts');
  const styles=read('src/styles/atal-patient-delivery.css');
  const main=read('src/main.tsx');
  assert.match(actions,/printPatientPlanPdf/);
  assert.match(actions,/patientPlanPdfBlob\(result\)/);
  assert.match(actions,/document\.createElement\('iframe'\)/);
  assert.match(actions,/window\.open\(url, '_blank'/);
  assert.match(styles,/#7eb695/i);
  assert.doesNotMatch(styles,/linear-gradient|radial-gradient/);
  assert.match(styles,/@media print/);
  assert.doesNotMatch(main,/atal-patient-delivery\.css/);
});