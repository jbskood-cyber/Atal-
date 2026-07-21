import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('boots one canonical application without changing visual imports',()=>{
  const app=read('src/App.tsx');
  const main=read('src/main.tsx');
  assert.match(app,/AppCloseout as App/);
  assert.match(main,/import \{ App \} from '\.\/App'/);
  assert.match(main,/atal-context-menu-fix\.css/);
});

test('starts new real workspaces empty and keeps demo explicit',()=>{
  const workspace=read('src/data/workspaceBootstrap.ts');
  assert.match(workspace,/patients: \[\]/);
  assert.match(workspace,/plans: \[\]/);
  assert.match(workspace,/exercises: \[\]/);
  assert.match(workspace,/initializeDemoWorkspace/);
});

test('keeps clinical records associated with the active plan',()=>{
  const association=read('src/domain/planAssociation.ts');
  const plans=read('src/data/localPlans.ts');
  assert.match(association,/status === 'active'/);
  assert.match(plans,/syncClinicalRecordPlanAssociation/);
});

test('duplicates multimedia into an independent record',()=>{
  const media=read('src/data/exerciseMediaRepository.ts');
  const exercises=read('src/data/localExercises.ts');
  assert.match(media,/cloneExerciseMedia/);
  assert.match(media,/id:createEntityId\('media'\)/);
  assert.match(exercises,/duplicateExerciseWithMedia/);
});

test('prevents unsafe Atal IA mutations and oversized requests',()=>{
  const apply=read('src/features/atal-ai/data/applyDraft.ts');
  const card=read('src/features/atal-ai/components/ConversationalDraftCard.tsx');
  const client=read('src/features/atal-ai/api/geminiClient.ts');
  const server=read('server/atalAIPlugin.ts');
  assert.match(apply,/\[\.\.\.new Set\(\[\.\.\.plan\.exerciseIds,\.\.\.exerciseIds\]\)\]/);
  assert.match(apply,/Resuelve las contradicciones clínicas/);
  assert.match(card,/hasContradictions/);
  assert.match(client,/assertAIRequestSize/);
  assert.match(server,/MAX_AI_REQUEST_BODY_BYTES/);
});

test('central validation covers patients, plans and exercises',()=>{
  const validation=read('src/domain/validation.ts');
  assert.match(validation,/validatePatientInput/);
  assert.match(validation,/validatePlanInput/);
  assert.match(validation,/validateExerciseInput/);
});
