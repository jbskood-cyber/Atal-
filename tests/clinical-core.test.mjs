import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('guided sessions preserve an immutable plan snapshot',()=>{
  const types=read('src/features/guided-session/types.ts');
  const storage=read('src/features/guided-session/storage.ts');
  const flow=read('src/features/guided-session/GuidedSessionFlow.tsx');
  assert.match(types,/planSnapshot\?: GuidedPlan/);
  assert.match(storage,/planSnapshot: structuredClone\(plan\)/);
  assert.match(storage,/sessionStoragePrefix/);
  assert.match(flow,/const plan = draft\.planSnapshot \?\? livePlan/);
});

test('completed sessions persist their historical clinical context',()=>{
  const repository=read('src/features/guided-session/sessionRepository.ts');
  const flow=read('src/features/guided-session/GuidedSessionFlow.tsx');
  assert.match(repository,/ClinicalSessionRecord/);
  assert.match(repository,/session\.planSnapshot = snapshot/);
  assert.match(flow,/saveCompletedClinicalSession/);
  assert.match(repository,/createdAt: startedAt/);
});

test('archived patients cannot continue active treatment',()=>{
  const patients=read('src/data/localPatients.ts');
  const portal=read('src/screens/PatientPortalPreviewScreen.tsx');
  const flow=read('src/features/guided-session/GuidedSessionFlow.tsx');
  assert.match(patients,/plan\.status='paused'/);
  assert.match(patients,/paciente archivado/);
  assert.match(portal,/patient\.status === 'archived'/);
  assert.match(flow,/patient\.status === 'archived'/);
});

test('tracking and reports are distinct clinical views',()=>{
  const activity=read('src/screens/ActivityScreen.tsx');
  assert.match(activity,/store\.events/);
  assert.match(activity,/view === 'tracking' \? timeline\.map/);
  assert.match(activity,/reports\.map/);
  assert.match(activity,/Historial clínico/);
  assert.match(activity,/Reportes de sesión/);
});

test('session reports include exercise-level outcomes and patient experience',()=>{
  const detail=read('src/screens/ActivityDetailScreen.tsx');
  assert.match(detail,/sessionPlanSnapshot/);
  assert.match(detail,/Detalle por ejercicio/);
  assert.match(detail,/Más fácil:/);
  assert.match(detail,/Más difícil:/);
  assert.match(detail,/useUnsavedChangesGuard/);
});

test('patient records expose contact and clinically meaningful metrics',()=>{
  const profile=read('src/screens/PatientProfileScreen.tsx');
  const metrics=read('src/domain/clinicalMetrics.ts');
  assert.match(profile,/Contacto de emergencia/);
  assert.match(profile,/Cambio promedio de dolor/);
  assert.match(profile,/Reportes pendientes/);
  assert.match(metrics,/summarizeClinicalSessions/);
  assert.match(metrics,/sessionNeedsAttention/);
});

test('clinical record editing validates and protects pending changes',()=>{
  const record=read('src/features/clinical-record/ClinicalRecordScreen.tsx');
  assert.match(record,/useUnsavedChangesGuard/);
  assert.match(record,/El motivo de consulta es obligatorio/);
  assert.match(record,/El dolor debe estar entre 0 y 10/);
  assert.match(record,/¿Salir sin guardar\?/);
});
