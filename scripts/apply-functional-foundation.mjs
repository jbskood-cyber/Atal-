import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith('\n') ? content : `${content}\n`);
};
const replaceOnce = (file, search, replacement) => {
  const current = read(file);
  if (!current.includes(search)) throw new Error(`Pattern not found in ${file}: ${search.slice(0, 120)}`);
  write(file, current.replace(search, replacement));
};
const replaceRegex = (file, expression, replacement) => {
  const current = read(file);
  if (!expression.test(current)) throw new Error(`Pattern not found in ${file}: ${expression}`);
  write(file, current.replace(expression, replacement));
};

// Package and test configuration.
const pkg = JSON.parse(read('package.json'));
pkg.scripts = {
  ...pkg.scripts,
  test: 'vitest',
  'test:run': 'vitest run',
  quality: 'npm run typecheck && npm run test:run && npm run build',
};
pkg.devDependencies = {
  ...pkg.devDependencies,
  '@testing-library/jest-dom': '^6.6.3',
  '@testing-library/react': '^16.3.0',
  '@testing-library/user-event': '^14.6.1',
  'fake-indexeddb': '^6.0.1',
  jsdom: '^26.1.0',
  vitest: '^3.2.4',
};
write('package.json', JSON.stringify(pkg, null, 2));

const tsconfig = JSON.parse(read('tsconfig.json'));
tsconfig.compilerOptions.types = Array.from(new Set([...(tsconfig.compilerOptions.types ?? []), 'vitest/globals', '@testing-library/jest-dom']));
tsconfig.include = Array.from(new Set([...(tsconfig.include ?? []), 'vitest.config.ts']));
write('tsconfig.json', JSON.stringify(tsconfig, null, 2));

write('vitest.config.ts', `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'next/navigation': path.resolve(__dirname, 'src/lib/next-navigation.ts'),
      'next/link': path.resolve(__dirname, 'src/lib/next-link.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
});
`);

write('src/test/setup.ts', `import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, 'scrollTo', { writable: true, value: vi.fn() });
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { writable: true, value: vi.fn() });
Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vi.fn() });

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  const store = await import('@/src/data/atalStore');
  store.resetAtalStoreCache();
});

afterEach(() => cleanup());
`);

write('src/test/smoke/appRoutes.test.tsx', `import { render, screen } from '@testing-library/react';
import { App } from '@/src/App';

function renderAt(pathname: string) {
  window.history.pushState({}, '', pathname);
  return render(<App />);
}

describe('canonical Atal routes', () => {
  it.each([
    ['/', 'Hoy'],
    ['/patients', 'Pacientes'],
    ['/plans', 'Planes'],
    ['/assistant', 'Atal IA'],
  ])('renders %s', (route, expected) => {
    renderAt(route);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });
});
`);

write('src/test/architecture/canonicalApp.test.ts', `import fs from 'node:fs';
import path from 'node:path';

describe('canonical application tree', () => {
  it('keeps App.tsx as a compatibility export only', () => {
    const source = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
    expect(source).toContain("export { AppCloseout as App } from './AppCloseout'");
    expect(source).not.toContain('<Routes>');
  });

  it('boots the canonical App export from main', () => {
    const source = fs.readFileSync(path.resolve('src/main.tsx'), 'utf8');
    expect(source).toContain("import { App } from './App'");
    expect(source).toContain('<App />');
  });
});
`);

// Canonical application.
write('src/App.tsx', `export { AppCloseout as App } from './AppCloseout';
`);
replaceOnce('src/main.tsx', "import { AppCloseout } from './AppCloseout';", "import { App } from './App';");
replaceOnce('src/main.tsx', '<React.StrictMode><AppCloseout /></React.StrictMode>', '<React.StrictMode><App /></React.StrictMode>');

// Empty/demo workspace separation.
write('src/data/demoWorkspace.ts', `import { exercises as demoExercises, patients as demoPatients, plans as demoPlans } from './atal-demo';
import type { ActivityEvent, AppSettings, AtalState, ExerciseEntity, PatientEntity, PlanEntity } from './atalStore';

export function createDefaultSettings(): AppSettings {
  return {
    notifications: true,
    haptics: true,
    compact: true,
    professionalName: 'Fisioterapeuta',
    specialty: 'Fisioterapeuta',
    clinic: '',
    sessionLock: true,
    clinicalPrivacy: true,
    aiSuggestions: true,
    aiAlerts: true,
    aiInstructions: 'Prioriza claridad, seguridad clínica y decisiones fáciles de revisar.',
  };
}

export function createEmptyAtalState(timestamp = new Date().toISOString()): AtalState {
  return {
    version: 2,
    seededAt: timestamp,
    updatedAt: timestamp,
    patients: [],
    plans: [],
    exercises: [],
    clinicalRecords: [],
    clinicalRecordVersions: [],
    sessions: [],
    notes: [],
    events: [],
    notifications: [],
    settings: createDefaultSettings(),
    feedback: [],
  };
}

export function createDemoAtalState(timestamp = new Date().toISOString()): AtalState {
  const patients: PatientEntity[] = demoPatients.map((patient) => ({
    id: patient.id,
    name: patient.name,
    diagnosis: patient.diagnosis,
    age: null,
    birthDate: '',
    sex: '',
    affectedArea: '',
    status: patient.status,
    visitType: 'first',
    contact: { phone: '', email: '', address: '', emergencyContact: '' },
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const exercises: ExerciseEntity[] = demoExercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    region: exercise.region,
    category: exercise.category,
    objective: 'Mejorar el movimiento de forma progresiva.',
    startingPosition: 'Colócate en una posición cómoda y estable.',
    instructions: ['Realiza el movimiento con control.', 'Respira con normalidad y evita compensaciones.'],
    precautions: 'Detente si aparece dolor fuerte o una molestia fuera de lo indicado.',
    equipment: 'Según indicación',
    difficulty: 'Inicial',
    sets: 3,
    repetitions: 10,
    rest: '30 segundos',
    maxPain: 3,
    tags: [exercise.region, exercise.category],
    notes: '',
    media: { type: 'image' },
    status: 'active',
    source: 'seed',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const plans: PlanEntity[] = demoPlans.map((plan, index) => ({
    id: plan.id,
    patientId: patients.find((patient) => patient.name === plan.patient)?.id ?? patients[index % patients.length].id,
    title: plan.title,
    focus: plan.phase,
    duration: plan.duration,
    frequency: plan.frequency,
    goal: 'Recuperar función y tolerancia al movimiento.',
    exerciseIds: exercises.slice(index % 6, index % 6 + 3).map((exercise) => exercise.id),
    status: plan.status,
    progression: 'Aumentar según tolerancia y calidad del movimiento.',
    reportCriteria: 'Reportar dolor elevado, síntomas o imposibilidad para completar.',
    generalInstructions: 'Realiza los ejercicios con calma y sigue las indicaciones de tu fisioterapeuta.',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  const events: ActivityEvent[] = patients.slice(0, 4).map((patient, index) => ({
    id: 'seed-event-' + patient.id,
    kind: 'patient_created',
    patientId: patient.id,
    title: 'Paciente',
    detail: patient.name,
    createdAt: new Date(Date.parse(timestamp) - index * 3600000).toISOString(),
  }));
  return {
    ...createEmptyAtalState(timestamp),
    patients,
    plans,
    exercises,
    events,
    settings: { ...createDefaultSettings(), professionalName: 'Cuenta demo' },
  };
}
`);

write('src/test/data/workspaceInitialization.test.ts', `import { createDemoAtalState, createEmptyAtalState } from '@/src/data/demoWorkspace';

describe('workspace initialization', () => {
  it('starts a real local workspace empty', () => {
    const state = createEmptyAtalState('2026-07-20T00:00:00.000Z');
    expect(state.patients).toEqual([]);
    expect(state.plans).toEqual([]);
    expect(state.exercises).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.settings.professionalName).toBe('Fisioterapeuta');
  });

  it('creates demo data only when explicitly requested', () => {
    const state = createDemoAtalState('2026-07-20T00:00:00.000Z');
    expect(state.patients.length).toBeGreaterThan(0);
    expect(state.plans.length).toBeGreaterThan(0);
    expect(state.exercises.length).toBeGreaterThan(0);
    expect(state.settings.professionalName).toBe('Cuenta demo');
  });
});
`);

write('src/domain/planAssociation.ts', `import type { AtalState } from '@/src/data/atalStore';

export function resolveAssociatedPlanId(state: AtalState, patientId: string, preferredPlanId = '') {
  const plans = state.plans.filter((plan) => plan.patientId === patientId);
  const newest = (items: typeof plans) => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const active = newest(plans.filter((plan) => plan.status === 'active'));
  if (active) return active.id;
  const preferred = plans.find((plan) => plan.id === preferredPlanId && plan.status !== 'archived');
  if (preferred) return preferred.id;
  return newest(plans.filter((plan) => plan.status !== 'archived'))?.id ?? '';
}

export function syncClinicalRecordPlanAssociation(state: AtalState, patientId: string, preferredPlanId = '') {
  const planId = resolveAssociatedPlanId(state, patientId, preferredPlanId);
  for (const record of state.clinicalRecords.filter((item) => item.patientId === patientId)) {
    record.planId = planId;
    record.updatedAt = state.updatedAt;
  }
}
`);

write('src/test/domain/planAssociation.test.ts', `import { createEmptyAtalState } from '@/src/data/demoWorkspace';
import { resolveAssociatedPlanId, syncClinicalRecordPlanAssociation } from '@/src/domain/planAssociation';

const plan = (id: string, status: 'draft'|'active'|'paused'|'completed'|'archived', updatedAt: string) => ({
  id, patientId: 'patient-1', title: id, focus: '', duration: '', frequency: '', goal: '', exerciseIds: [],
  status, progression: '', reportCriteria: '', generalInstructions: '', createdAt: updatedAt, updatedAt,
});

describe('clinical plan association', () => {
  it('keeps the active plan when a newer draft is created', () => {
    const state = createEmptyAtalState();
    state.plans = [plan('active', 'active', '2026-01-01'), plan('draft', 'draft', '2026-02-01')];
    expect(resolveAssociatedPlanId(state, 'patient-1', 'draft')).toBe('active');
  });

  it('uses an explicit non-archived plan when no active plan exists', () => {
    const state = createEmptyAtalState();
    state.plans = [plan('paused', 'paused', '2026-01-01'), plan('draft', 'draft', '2026-02-01')];
    expect(resolveAssociatedPlanId(state, 'patient-1', 'paused')).toBe('paused');
  });

  it('falls back to the newest non-archived plan and synchronizes the record', () => {
    const state = createEmptyAtalState();
    state.plans = [plan('old', 'completed', '2026-01-01'), plan('new', 'draft', '2026-02-01')];
    state.clinicalRecords = [{
      id: 'record-1', patientId: 'patient-1', version: 1, date: '', reasonForVisit: '', evolution: '',
      affectedArea: '', symptoms: [], painLevel: null, providedDiagnosis: '', functionalLimitations: [],
      goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: 'missing',
      professional: '', createdAt: '', updatedAt: '',
    }];
    syncClinicalRecordPlanAssociation(state, 'patient-1');
    expect(state.clinicalRecords[0].planId).toBe('new');
  });
});
`);

replaceOnce('src/data/atalStore.ts',
  "import { exercises as demoExercises, patients as demoPatients, plans as demoPlans } from './atal-demo';",
  "import { createDemoAtalState, createEmptyAtalState } from './demoWorkspace';\nimport { syncClinicalRecordPlanAssociation } from '@/src/domain/planAssociation';"
);
replaceRegex('src/data/atalStore.ts', /function seedState\(\): AtalState \{[\s\S]*?\n\}\n\nfunction mergeLegacy/, 'function seedState(): AtalState { return createEmptyAtalState(); }\n\nfunction mergeLegacy');
replaceOnce('src/data/atalStore.ts', 'settings:{...seedState().settings,...stored.settings}', 'settings:{...createEmptyAtalState(timestamp).settings,...stored.settings}');
replaceOnce('src/data/atalStore.ts', 'cache = mergeLegacy(seedState());', 'cache = mergeLegacy(createEmptyAtalState());');
replaceOnce('src/data/atalStore.ts',
  "export function getAtalState() { return loadState(); }",
  `export function getAtalState() { return loadState(); }
export function resetAtalStoreCache() { cache = null; }
export function replaceAtalState(next: AtalState) {
  const normalized = structuredClone(next);
  localStorage.setItem(ATAL_STORE_KEY, JSON.stringify(normalized));
  cache = normalized;
  emit();
  return normalized;
}
export function initializeDemoWorkspace() { return replaceAtalState(createDemoAtalState()); }
export function initializeEmptyWorkspace() { return replaceAtalState(createEmptyAtalState()); }`
);
replaceRegex('src/data/atalStore.ts',
  /export function createPlan\(input:Omit<PlanEntity,'id'\|'createdAt'\|'updatedAt'>\)\{[\s\S]*?return plan;\}/,
  `export function createPlan(input:Omit<PlanEntity,'id'|'createdAt'|'updatedAt'>){const timestamp=now();const plan={...input,id:createEntityId('plan'),exerciseIds:[...new Set(input.exerciseIds)],createdAt:timestamp,updatedAt:timestamp};mutateAtalStore((draft)=>{draft.plans.push(plan);syncClinicalRecordPlanAssociation(draft,plan.patientId,plan.id);addEvent(draft,{kind:'plan_created',patientId:plan.patientId,planId:plan.id,title:'Plan creado',detail:plan.title});});return plan;}`
);
replaceRegex('src/data/atalStore.ts',
  /export function updatePlan\(id:string,patch:Partial<PlanEntity>\)\{[\s\S]*?return result;\}/,
  `export function updatePlan(id:string,patch:Partial<PlanEntity>){let result:PlanEntity|null=null;mutateAtalStore((draft)=>{const index=draft.plans.findIndex((item)=>item.id===id);if(index<0)throw new Error('Plan no encontrado.');result={...draft.plans[index],...patch,id,exerciseIds:patch.exerciseIds?[...new Set(patch.exerciseIds)]:draft.plans[index].exerciseIds,updatedAt:now()};draft.plans[index]=result;syncClinicalRecordPlanAssociation(draft,result.patientId,result.id);addEvent(draft,{kind:'plan_updated',patientId:result.patientId,planId:id,title:'Plan actualizado',detail:result.title});});return result;}`
);
replaceOnce('src/data/atalStore.ts',
  "if(status==='active')addNotification(draft,{title:'Plan activo',detail:`${plan.title} ya está disponible para el paciente.`,severity:'stable',href:`/plans/${id}`});});}",
  "syncClinicalRecordPlanAssociation(draft,plan.patientId,plan.id);if(status==='active')addNotification(draft,{title:'Plan activo',detail:`${plan.title} ya está disponible para el paciente.`,severity:'stable',href:`/plans/${id}`});});}"
);
replaceRegex('src/data/atalStore.ts',
  /export function deletePlan\(id:string\)\{[\s\S]*?\}\n\nexport function createExercise/,
  `export function deletePlan(id:string){const state=loadState();if(state.sessions.some((session)=>session.planId===id))throw new Error('Este plan tiene sesiones y no puede eliminarse. Archívalo para conservar el historial.');const patientId=state.plans.find((item)=>item.id===id)?.patientId;mutateAtalStore((draft)=>{draft.plans=draft.plans.filter((item)=>item.id!==id);if(patientId)syncClinicalRecordPlanAssociation(draft,patientId);});}

export function createExercise`
);
replaceRegex('src/data/atalStore.ts',
  /export function duplicateExercise\(id:string\)\{[\s\S]*?\}\nexport function archiveExercise/,
  `export function duplicateExercise(id:string){const source=loadState().exercises.find((item)=>item.id===id);if(!source)throw new Error('Ejercicio no encontrado.');return createExercise({...source,id:undefined,createdAt:undefined,updatedAt:undefined,name:source.name+' — copia',media:{type:'none'},status:'active',source:'local'} as unknown as Omit<ExerciseEntity,'id'|'createdAt'|'updatedAt'>);}
export function archiveExercise`
);

write('src/screens/SystemStatesScreen.tsx', `'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, Database, Inbox, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { initializeDemoWorkspace, initializeEmptyWorkspace } from '@/src/data/atalStore';

const states={empty:{icon:Inbox,title:'Sin resultados',text:'Prueba modificando tu búsqueda o creando un registro.'},loading:{icon:LoaderCircle,title:'Cargando información',text:'Estamos preparando tu espacio clínico.'},error:{icon:AlertTriangle,title:'Algo salió mal',text:'No pudimos cargar esta información.'},offline:{icon:CloudOff,title:'Sin conexión',text:'Revisa tu conexión e inténtalo nuevamente.'},success:{icon:CheckCircle2,title:'Todo listo',text:'Los cambios se guardaron correctamente.'}} as const;

export function SystemStatesScreen(){
  const[current,setCurrent]=useState<keyof typeof states>('empty');
  const[confirm,setConfirm]=useState<'demo'|'empty'|null>(null);
  const state=states[current];const Icon=state.icon;
  const apply=()=>{if(confirm==='demo')initializeDemoWorkspace();if(confirm==='empty')initializeEmptyWorkspace();setConfirm(null);window.location.assign('/');};
  return <AtalShell><main className="atal-content atal-flow-page"><div className="atal-form-heading"><span className="atal-eyebrow">Sistema visual</span><h1>Estados de la app</h1><p>Comportamientos locales antes de conectar servicios.</p></div><div className="atal-state-tabs">{Object.keys(states).map(key=><button type="button" key={key} className={current===key?'is-active':''} onClick={()=>setCurrent(key as keyof typeof states)}>{key}</button>)}</div><section className={'atal-system-state is-'+current}><span><Icon className={current==='loading'?'is-spinning':''}/></span><h2>{state.title}</h2><p>{state.text}</p><button type="button"><RotateCcw/>Reintentar</button></section><section className="atal-profile-section"><h2>Herramientas de desarrollo local</h2><p>Estas acciones sustituyen todo el contenido del dispositivo y nunca se ejecutan automáticamente.</p><div className="atal-profile-actions"><button type="button" onClick={()=>setConfirm('demo')}><Database/>Cargar espacio demo</button><button type="button" onClick={()=>setConfirm('empty')}><Trash2/>Vaciar espacio local</button></div></section>{confirm&&<div className="atal-overlay" onMouseDown={()=>setConfirm(null)}><section className="atal-native-sheet" role="dialog" aria-modal="true" onMouseDown={event=>event.stopPropagation()}><header><h2>{confirm==='demo'?'¿Cargar datos demo?':'¿Vaciar este dispositivo?'}</h2></header><p>Se reemplazarán pacientes, planes, ejercicios, sesiones y ajustes almacenados localmente.</p><button type="button" className="atal-submit-button" onClick={apply}>{confirm==='demo'?'Cargar demo':'Vaciar datos'}</button><button type="button" onClick={()=>setConfirm(null)}>Cancelar</button></section></div>}</main></AtalShell>;
}
`);

replaceOnce('src/data/exerciseMediaRepository.ts',
  "export async function deleteExerciseMedia(id:string){const db=await openDatabase();await requestResult(db.transaction(STORE,'readwrite').objectStore(STORE).delete(id));db.close();}",
  `export async function deleteExerciseMedia(id:string){const db=await openDatabase();await requestResult(db.transaction(STORE,'readwrite').objectStore(STORE).delete(id));db.close();}
export async function cloneExerciseMedia(sourceMediaId:string,targetExerciseId:string){const source=await getExerciseMedia(sourceMediaId);if(!source)throw new Error('No encontramos el recurso multimedia que deseas duplicar.');const files=source.files.map((file)=>file.slice(0,file.size,file.type));const timestamp=new Date().toISOString();const record:ExerciseMediaRecord={...source,id:createEntityId('media'),exerciseId:targetExerciseId,files,names:[...source.names],mimeTypes:[...source.mimeTypes],createdAt:timestamp,updatedAt:timestamp};const db=await openDatabase();const transaction=db.transaction(STORE,'readwrite');await requestResult(transaction.objectStore(STORE).put(record));db.close();return record;}`
);
replaceOnce('src/data/localExercises.ts',
  "import { archiveExercise, createExercise, deleteExercise, duplicateExercise, getAtalState, mutateAtalStore, updateExercise, useAtalStore, type ExerciseEntity, type ExerciseMediaRef } from './atalStore';",
  "import { archiveExercise, createExercise, deleteExercise, duplicateExercise, getAtalState, mutateAtalStore, updateExercise, useAtalStore, type ExerciseEntity, type ExerciseMediaRef } from './atalStore';\nimport { cloneExerciseMedia, deleteExerciseMedia } from './exerciseMediaRepository';"
);
replaceOnce('src/data/localExercises.ts',
  "export {duplicateExercise,deleteExercise};",
  `export {duplicateExercise,deleteExercise};
export async function duplicateExerciseWithMedia(id:string){const source=getAtalState().exercises.find((item)=>item.id===id);if(!source)throw new Error('Ejercicio no encontrado.');const copy=duplicateExercise(id);try{if(source.media.mediaId){const media=await cloneExerciseMedia(source.media.mediaId,copy.id);return updateExercise(copy.id,{media:{...source.media,mediaId:media.id}})!;}return copy;}catch(error){deleteExercise(copy.id);throw error;}}
export async function deleteExerciseWithMedia(id:string){const exercise=getAtalState().exercises.find((item)=>item.id===id);if(!exercise)return;if(exercise.media.mediaId)await deleteExerciseMedia(exercise.media.mediaId);deleteExercise(id);}`
);

write('src/test/data/exerciseDuplication.test.ts', `import 'fake-indexeddb/auto';
import { createExercise, getAtalState, resetAtalStoreCache } from '@/src/data/atalStore';
import { initializeEmptyWorkspace } from '@/src/data/atalStore';
import { duplicateExerciseWithMedia } from '@/src/data/localExercises';
import { getExerciseMedia, saveExerciseMedia } from '@/src/data/exerciseMediaRepository';

describe('exercise duplication', () => {
  beforeEach(() => { localStorage.clear(); resetAtalStoreCache(); initializeEmptyWorkspace(); });

  it('creates independent exercise and media identifiers', async () => {
    const source = createExercise({name:'Puente',region:'Lumbar',category:'Fuerza',objective:'',startingPosition:'',instructions:['Subir'],precautions:'',equipment:'',difficulty:'',sets:3,repetitions:10,rest:'',maxPain:3,tags:[],notes:'',media:{type:'none'},status:'active',source:'local'});
    const file = new File(['image'], 'exercise.png', { type: 'image/png' });
    const media = await saveExerciseMedia(source.id, 'image', [file]);
    const state = getAtalState();
    state.exercises.find((item)=>item.id===source.id)!.media={type:'image',mediaId:media.id};
    localStorage.setItem('atal:store:v2', JSON.stringify(state));resetAtalStoreCache();
    const copy = await duplicateExerciseWithMedia(source.id);
    expect(copy.id).not.toBe(source.id);
    expect(copy.media.mediaId).not.toBe(media.id);
    expect(await getExerciseMedia(copy.media.mediaId!)).not.toBeNull();
  });
});
`);

write('src/features/plan-closeout/planEditSession.ts', `export type PlanEditSession = { stagedExerciseIds: Set<string>; saved: boolean };
export function createPlanEditSession(): PlanEditSession { return { stagedExerciseIds: new Set(), saved: false }; }
export function stagePlanExercise(session: PlanEditSession, exerciseId: string) { session.stagedExerciseIds.add(exerciseId); }
export function promotePlanEditSession(session: PlanEditSession) { session.saved = true; session.stagedExerciseIds.clear(); }
export function discardPlanEditSession(session: PlanEditSession) { const ids=[...session.stagedExerciseIds];session.stagedExerciseIds.clear();return ids; }
`);

write('src/test/features/planEditSession.test.ts', `import { createPlanEditSession, discardPlanEditSession, promotePlanEditSession, stagePlanExercise } from '@/src/features/plan-closeout/planEditSession';

describe('plan edit session', () => {
  it('returns staged exercises for cleanup when discarded', () => {
    const session=createPlanEditSession();stagePlanExercise(session,'exercise-copy');
    expect(discardPlanEditSession(session)).toEqual(['exercise-copy']);
  });
  it('promotes staged exercises on save', () => {
    const session=createPlanEditSession();stagePlanExercise(session,'exercise-copy');promotePlanEditSession(session);
    expect(discardPlanEditSession(session)).toEqual([]);
  });
});
`);

replaceOnce('src/features/plan-closeout/SafePlanExerciseList.tsx',
  "import { duplicateExercise, useExerciseCatalog } from '@/src/data/localExercises';",
  "import { duplicateExerciseWithMedia, useExerciseCatalog } from '@/src/data/localExercises';"
);
replaceOnce('src/features/plan-closeout/SafePlanExerciseList.tsx',
  "  onMessage,\n}: {\n  exerciseIds: string[];\n  onChange: (ids: string[]) => void;\n  onMessage: (message: string) => void;\n})",
  "  onMessage,\n  onDuplicateCreated,\n}: {\n  exerciseIds: string[];\n  onChange: (ids: string[]) => void;\n  onMessage: (message: string) => void;\n  onDuplicateCreated?: (id: string) => void;\n})"
);
replaceRegex('src/features/plan-closeout/SafePlanExerciseList.tsx',
  /  const duplicate = \(\) => \{[\s\S]*?  \};\n\n  const remove/,
  `  const duplicate = async () => {
    if (!menuId) return;
    const sourceId = menuId;
    const index = exerciseIds.indexOf(sourceId);
    closeMenu();
    try {
      const copy = await duplicateExerciseWithMedia(sourceId);
      const next = [...exerciseIds];
      next.splice(index + 1, 0, copy.id);
      onDuplicateCreated?.(copy.id);
      onChange(next);
      onMessage('Ejercicio duplicado en el plan.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'No pudimos duplicar el ejercicio.');
    }
  };

  const remove`
);
replaceOnce('src/features/plan-closeout/SafePlanExerciseList.tsx', 'onClick={duplicate}', 'onClick={() => void duplicate()}');

write('src/domain/validation.ts', `export type ValidationResult = { valid: boolean; errors: Record<string,string> };
const result=(errors:Record<string,string>):ValidationResult=>({valid:Object.keys(errors).length===0,errors});

export function validatePatientInput(input:{name:string;diagnosis:string;age:number|null}):ValidationResult{
  const errors:Record<string,string>={};
  if(!input.name.trim())errors.name='El nombre es obligatorio.';
  if(!input.diagnosis.trim())errors.diagnosis='El motivo o diagnóstico es obligatorio.';
  if(input.age!==null&&(!Number.isInteger(input.age)||input.age<0||input.age>130))errors.age='La edad debe estar entre 0 y 130 años.';
  return result(errors);
}
export function validatePlanInput(input:{title:string;status:'draft'|'active'|'paused'|'completed'|'archived';exerciseIds:string[]}):ValidationResult{
  const errors:Record<string,string>={};
  if(!input.title.trim())errors.title='El título del plan es obligatorio.';
  if(input.status==='active'&&!input.exerciseIds.length)errors.exerciseIds='Un plan activo debe incluir al menos un ejercicio.';
  return result(errors);
}
export function validateExerciseInput(input:{name:string;instructions:string[];sets:number;repetitions?:number;time?:string;maxPain:number|null}):ValidationResult{
  const errors:Record<string,string>={};
  if(!input.name.trim())errors.name='El nombre del ejercicio es obligatorio.';
  if(!input.instructions.some((item)=>item.trim()))errors.instructions='Añade al menos una instrucción.';
  if(!Number.isInteger(input.sets)||input.sets<1)errors.sets='Las series deben ser un número mayor o igual que 1.';
  if((input.repetitions===undefined||input.repetitions<1)&&!input.time?.trim())errors.dose='Indica repeticiones o tiempo.';
  if(input.maxPain!==null&&(input.maxPain<0||input.maxPain>10))errors.maxPain='El dolor máximo debe estar entre 0 y 10.';
  return result(errors);
}
`);

write('src/test/domain/validation.test.ts', `import { validateExerciseInput, validatePatientInput, validatePlanInput } from '@/src/domain/validation';

describe('clinical validation', () => {
  it('rejects blank patient names and invalid ages', () => {
    const value=validatePatientInput({name:' ',diagnosis:'Dolor',age:145});
    expect(value.valid).toBe(false);expect(value.errors.name).toBeTruthy();expect(value.errors.age).toBeTruthy();
  });
  it('rejects active plans without exercises', () => {
    expect(validatePlanInput({title:'Plan',status:'active',exerciseIds:[]}).errors.exerciseIds).toBeTruthy();
  });
  it('rejects exercises without instructions or dose', () => {
    const value=validateExerciseInput({name:'Ejercicio',instructions:[],sets:0,maxPain:12});
    expect(value.valid).toBe(false);expect(value.errors.instructions).toBeTruthy();expect(value.errors.dose).toBeTruthy();
  });
});
`);

write('src/hooks/useUnsavedChangesGuard.ts', `import { useCallback, useEffect, useState } from 'react';

export function useUnsavedChangesGuard(dirty:boolean){
  const[pending,setPending]=useState<null|(()=>void)>(null);
  useEffect(()=>{if(!dirty)return;const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload)},[dirty]);
  const requestNavigation=useCallback((action:()=>void)=>{if(!dirty){action();return true;}setPending(()=>action);return false;},[dirty]);
  const confirmDiscard=useCallback(()=>{const action=pending;setPending(null);action?.();},[pending]);
  const cancelDiscard=useCallback(()=>setPending(null),[]);
  return{hasPendingNavigation:Boolean(pending),requestNavigation,confirmDiscard,cancelDiscard};
}
`);

write('src/test/hooks/useUnsavedChangesGuard.test.tsx', `import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/src/hooks/useUnsavedChangesGuard';

describe('useUnsavedChangesGuard', () => {
  it('runs navigation immediately when clean', () => {
    const action=vi.fn();const{result}=renderHook(()=>useUnsavedChangesGuard(false));
    act(()=>{result.current.requestNavigation(action)});expect(action).toHaveBeenCalledOnce();
  });
  it('requires confirmation when dirty', () => {
    const action=vi.fn();const{result}=renderHook(()=>useUnsavedChangesGuard(true));
    act(()=>{result.current.requestNavigation(action)});expect(action).not.toHaveBeenCalled();
    act(()=>result.current.confirmDiscard());expect(action).toHaveBeenCalledOnce();
  });
});
`);

replaceOnce('src/screens/NewPatientScreen.tsx',
  "import { addPatientNote,createPatientWithRecord,useAtalStore } from '@/src/data/atalStore';",
  "import { addPatientNote,createPatientWithRecord,useAtalStore } from '@/src/data/atalStore';\nimport { validatePatientInput } from '@/src/domain/validation';"
);
replaceOnce('src/screens/NewPatientScreen.tsx',
  "  const [visit, setVisit] = useState<'first' | 'followup'>('first');",
  "  const [visit, setVisit] = useState<'first' | 'followup'>('first');\n  const [error,setError]=useState('');"
);
replaceOnce('src/screens/NewPatientScreen.tsx',
  "    if (!name.trim() || !diagnosis.trim()) return;\n    const {patient}=createPatientWithRecord",
  "    const ageValue=age?Number(age):null;const validation=validatePatientInput({name,diagnosis,age:ageValue});if(!validation.valid){setError(Object.values(validation.errors)[0]);return;}setError('');\n    const {patient}=createPatientWithRecord"
);
replaceOnce('src/screens/NewPatientScreen.tsx', "age:age?Number(age):null", "age:ageValue");
replaceOnce('src/screens/NewPatientScreen.tsx',
  "        <button type=\"submit\" className=\"atal-submit-button\"",
  "        {error&&<p className=\"atal-form-error\" role=\"alert\">{error}</p>}<button type=\"submit\" className=\"atal-submit-button\""
);

replaceOnce('src/screens/PatientProfileScreen.tsx',
  "import { addPatientNote,deletePatientNote,updatePatientNote,useAtalStore,type ActivityEvent,type PatientNote,type SessionRecord } from '@/src/data/atalStore';",
  "import { addPatientNote,deletePatientNote,updatePatientNote,useAtalStore,type ActivityEvent,type PatientNote,type SessionRecord } from '@/src/data/atalStore';\nimport { validatePatientInput } from '@/src/domain/validation';"
);
replaceOnce('src/screens/PatientProfileScreen.tsx',
  "const savePatient=()=>{updateLocalPatient(patient.id,{name:form.name.trim(),diagnosis:form.diagnosis.trim(),age:form.age?Number(form.age):null,birthDate:form.birthDate,sex:form.sex,affectedArea:form.affectedArea});setEditing(false);setMessage('Datos guardados.');};",
  "const savePatient=()=>{const age=form.age?Number(form.age):null;const validation=validatePatientInput({name:form.name,diagnosis:form.diagnosis,age});if(!validation.valid){setMessage(Object.values(validation.errors)[0]);return;}updateLocalPatient(patient.id,{name:form.name.trim(),diagnosis:form.diagnosis.trim(),age,birthDate:form.birthDate,sex:form.sex,affectedArea:form.affectedArea});setEditing(false);setMessage('Datos guardados.');};"
);

replaceOnce('src/screens/PlanBuilderCloseoutScreen.tsx',
  "import{AppSelect}from'@/src/components/atal/AppSelect';",
  "import{AppSelect}from'@/src/components/atal/AppSelect';import{validatePlanInput}from'@/src/domain/validation';"
);
replaceOnce('src/screens/PlanBuilderCloseoutScreen.tsx',
  "[selectedIds,setSelectedIds]=useState<string[]>([]),patient=",
  "[selectedIds,setSelectedIds]=useState<string[]>([]),[error,setError]=useState(''),patient="
);
replaceOnce('src/screens/PlanBuilderCloseoutScreen.tsx',
  "const submit=(event:FormEvent)=>{event.preventDefault();if(!canSubmit||!patient)return;const plan=createLocalPlan",
  "const submit=(event:FormEvent)=>{event.preventDefault();if(!patient)return;const validation=validatePlanInput({title,status:'draft',exerciseIds:selectedIds});if(!validation.valid){setError(Object.values(validation.errors)[0]);return;}setError('');const plan=createLocalPlan"
);
replaceOnce('src/screens/PlanBuilderCloseoutScreen.tsx',
  "<button type=\"submit\" className=\"atal-submit-button\"",
  "{error&&<p className=\"atal-form-error\" role=\"alert\">{error}</p>}<button type=\"submit\" className=\"atal-submit-button\""
);

replaceOnce('src/screens/NewExerciseCloseoutScreen.tsx',
  "import{saveExerciseMedia}from'@/src/data/exerciseMediaRepository';",
  "import{saveExerciseMedia}from'@/src/data/exerciseMediaRepository';import{validateExerciseInput}from'@/src/domain/validation';"
);
replaceOnce('src/screens/NewExerciseCloseoutScreen.tsx',
  "if(media!=='none'&&!files.length){setError('Selecciona el recurso visual antes de guardar.');setSaving(false);return}",
  "const instructionList=instructions.split(/\\r?\\n/).map(line=>line.trim()).filter(Boolean);const validation=validateExerciseInput({name,instructions:instructionList,sets:Math.max(0,number('sets',0)),repetitions:mode==='time'?undefined:number('repetitions',0),time:mode==='repetitions'?undefined:text('time'),maxPain:number('maxPain',3)});if(!validation.valid){setError(Object.values(validation.errors)[0]);setSaving(false);return}if(media!=='none'&&!files.length){setError('Selecciona el recurso visual antes de guardar.');setSaving(false);return}"
);
replaceOnce('src/screens/NewExerciseCloseoutScreen.tsx',
  "instructions:instructions.split(/\\r?\\n/).map(line=>line.trim()).filter(Boolean)",
  "instructions:instructionList"
);

replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "import{useEffect,useState}from'react';",
  "import{useEffect,useRef,useState}from'react';"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "import{useAtalStore}from'@/src/data/atalStore';",
  "import{useAtalStore}from'@/src/data/atalStore';import{deleteExerciseWithMedia}from'@/src/data/localExercises';import{createPlanEditSession,discardPlanEditSession,promotePlanEditSession,stagePlanExercise}from'@/src/features/plan-closeout/planEditSession';import{validatePlanInput}from'@/src/domain/validation';import{useUnsavedChangesGuard}from'@/src/hooks/useUnsavedChangesGuard';"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "[exerciseIds,setExerciseIds]=useState(plan?.exerciseIds??[]);useEffect",
  "[exerciseIds,setExerciseIds]=useState(plan?.exerciseIds??[]),editSession=useRef(createPlanEditSession());useEffect"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "const dirty=title!==plan.title||focus!==plan.focus||goal!==plan.goal||duration!==plan.duration||frequency!==plan.frequency||progression!==plan.progression||criterion!==plan.reportCriteria||instructions!==plan.generalInstructions||exerciseIds.join('|')!==plan.exerciseIds.join('|'),save=()=>{try{updateLocalPlan",
  "const dirty=title!==plan.title||focus!==plan.focus||goal!==plan.goal||duration!==plan.duration||frequency!==plan.frequency||progression!==plan.progression||criterion!==plan.reportCriteria||instructions!==plan.generalInstructions||exerciseIds.join('|')!==plan.exerciseIds.join('|'),guard=useUnsavedChangesGuard(dirty),save=()=>{try{const validation=validatePlanInput({title,status:plan.status,exerciseIds});if(!validation.valid){setMessage(Object.values(validation.errors)[0]);return;}updateLocalPlan"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "exerciseIds});setMessage('Plan guardado')",
  "exerciseIds});promotePlanEditSession(editSession.current);setMessage('Plan guardado')"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "changeStatus=(action:'activate'|'pause'|'complete'|'archive'|'restore')=>{try{",
  "changeStatus=(action:'activate'|'pause'|'complete'|'archive'|'restore')=>{if(dirty){guard.requestNavigation(()=>changeStatus(action));return;}try{if(action==='activate'){const validation=validatePlanInput({title,status:'active',exerciseIds});if(!validation.valid){setMessage(Object.values(validation.errors)[0]);return;}}"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "<button type=\"button\" onClick={()=>router.push('/plans')}><ArrowLeft/></button>",
  "<button type=\"button\" onClick={()=>guard.requestNavigation(()=>router.push('/plans'))}><ArrowLeft/></button>"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "<SafePlanExerciseList exerciseIds={exerciseIds} onChange={setExerciseIds} onMessage={setMessage}/>",
  "<SafePlanExerciseList exerciseIds={exerciseIds} onChange={setExerciseIds} onMessage={setMessage} onDuplicateCreated={id=>{stagePlanExercise(editSession.current,id)}}/>"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "onClick={()=>{const copy=duplicatePlan(plan.id);router.push(`/plans/${copy.id}`)}}",
  "onClick={()=>guard.requestNavigation(()=>{const copy=duplicatePlan(plan.id);router.push(`/plans/${copy.id}`)})}"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "onClick={()=>{try{deletePlan(plan.id);router.push('/plans')}catch(error)",
  "onClick={()=>guard.requestNavigation(()=>{try{deletePlan(plan.id);router.push('/plans')}catch(error)"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "setMenu(false)}}}><Trash2/>Eliminar si es seguro</button>",
  "setMenu(false)}})}><Trash2/>Eliminar si es seguro</button>"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "{confirmArchive&&<Confirm",
  "{guard.hasPendingNavigation&&<Confirm title=\"¿Descartar cambios sin guardar?\" text=\"Los cambios pendientes de este plan se perderán.\" confirm=\"Descartar cambios\" onConfirm={guard.confirmDiscard} onCancel={guard.cancelDiscard}/>} {confirmArchive&&<Confirm"
);
replaceOnce('src/screens/PlanDetailCloseoutScreen.tsx',
  "},[plan?.id]);if(!plan)return",
  "},[plan?.id]);useEffect(()=>()=>{for(const id of discardPlanEditSession(editSession.current))void deleteExerciseWithMedia(id)},[]);if(!plan)return"
);

replaceOnce('src/screens/ExerciseDetailScreen.tsx',
  "  duplicateExercise,\n",
  "  duplicateExerciseWithMedia,\n"
);
replaceOnce('src/screens/ExerciseDetailScreen.tsx',
  "} from '@/src/data/localExercises';",
  "} from '@/src/data/localExercises';\nimport { validateExerciseInput } from '@/src/domain/validation';"
);
replaceOnce('src/screens/ExerciseDetailScreen.tsx',
  "  const save = () => {\n    updateLocalExercise(exercise.id, {",
  "  const save = () => {\n    const instructions=form.instructions.split('\\n').map((line)=>line.trim()).filter(Boolean);const validation=validateExerciseInput({name:form.name,instructions,sets:Number(form.sets),repetitions:form.repetitions?Number(form.repetitions):undefined,time:form.time,maxPain:form.maxPain?Number(form.maxPain):null});if(!validation.valid){setMessage(Object.values(validation.errors)[0]);return;}\n    updateLocalExercise(exercise.id, {"
);
replaceOnce('src/screens/ExerciseDetailScreen.tsx',
  "instructions: form.instructions.split('\\n').map((line) => line.trim()).filter(Boolean),",
  "instructions,"
);
replaceRegex('src/screens/ExerciseDetailScreen.tsx',
  /  const duplicate = \(\) => \{[\s\S]*?  \};\n\n  const toggleArchive/,
  `  const duplicate = async () => {
    setActionsOpen(false);
    try {
      const copy = await duplicateExerciseWithMedia(exercise.id);
      router.push('/exercises/'+copy.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos duplicar el ejercicio.');
    }
  };

  const toggleArchive`
);
replaceOnce('src/screens/ExerciseDetailScreen.tsx', 'onClick={duplicate}', 'onClick={() => void duplicate()}');

write('src/features/atal-ai/domain/attachmentLimits.ts', `export const MAX_AI_FILES=8;
export const MAX_AI_FILE_BYTES=8*1024*1024;
export const MAX_AI_ENCODED_ATTACHMENTS_BYTES=24*1024*1024;
export const MAX_AI_REQUEST_BODY_BYTES=30*1024*1024;
export type AttachmentSize={name:string;size:number};
export type AttachmentLimitResult={valid:boolean;message:string;encodedBytes:number};
export const estimateBase64Bytes=(bytes:number)=>Math.ceil(bytes/3)*4;
export function validateAttachmentSelection(incoming:AttachmentSize[],existing:AttachmentSize[]=[]):AttachmentLimitResult{
  const files=[...existing,...incoming];
  if(files.length>MAX_AI_FILES)return{valid:false,message:'Puedes combinar hasta '+MAX_AI_FILES+' archivos.',encodedBytes:0};
  const oversized=files.find((file)=>file.size>MAX_AI_FILE_BYTES);
  if(oversized)return{valid:false,message:oversized.name+': supera 8 MB.',encodedBytes:0};
  const encodedBytes=files.reduce((sum,file)=>sum+estimateBase64Bytes(file.size),0);
  if(encodedBytes>MAX_AI_ENCODED_ATTACHMENTS_BYTES)return{valid:false,message:'La selección completa supera el límite seguro de envío. Reduce el número o tamaño de los archivos.',encodedBytes};
  return{valid:true,message:'',encodedBytes};
}
`);

write('src/features/atal-ai/domain/exerciseMutation.ts', `export type AIExerciseMutationMode='preserve'|'append'|'replace-one'|'remove-one'|'replace-all';
export type AIExerciseMutation={mode:AIExerciseMutationMode;targetExerciseId:string};
export function applyExerciseMutation(existingIds:string[],preparedIds:string[],mutation:AIExerciseMutation){
  const existing=[...new Set(existingIds)];const prepared=[...new Set(preparedIds)];
  if(mutation.mode==='preserve')return existing;
  if(mutation.mode==='append')return[...new Set([...existing,...prepared])];
  if(mutation.mode==='replace-all')return prepared;
  const target=mutation.targetExerciseId;
  if(!target||!existing.includes(target))throw new Error('Selecciona un ejercicio válido para modificar la rutina.');
  if(mutation.mode==='remove-one')return existing.filter((id)=>id!==target);
  if(prepared.length!==1)throw new Error('Reemplazar un ejercicio requiere exactamente un ejercicio nuevo o reutilizado.');
  return existing.map((id)=>id===target?prepared[0]:id);
}
`);

write('src/features/atal-ai/domain/contradictionGate.ts', `import type { AtalAIDraft } from '../types';
export function canApplyAtalDraft(draft:AtalAIDraft|null,override=false){return Boolean(draft&&(!draft.contradictions.length||override));}
`);

write('src/test/atal-ai/exerciseMutation.test.ts', `import { applyExerciseMutation } from '@/src/features/atal-ai/domain/exerciseMutation';
describe('AI exercise mutations',()=>{
  it('preserves a complete plan when Gemini returns a partial list',()=>expect(applyExerciseMutation(['a','b'],['c'],{mode:'preserve',targetExerciseId:''})).toEqual(['a','b']));
  it('appends without duplicates',()=>expect(applyExerciseMutation(['a','b'],['b','c'],{mode:'append',targetExerciseId:''})).toEqual(['a','b','c']));
  it('replaces one explicit exercise',()=>expect(applyExerciseMutation(['a','b'],['c'],{mode:'replace-one',targetExerciseId:'b'})).toEqual(['a','c']));
});
`);
write('src/test/atal-ai/attachmentLimits.test.ts', `import { estimateBase64Bytes, validateAttachmentSelection } from '@/src/features/atal-ai/domain/attachmentLimits';
describe('AI attachment limits',()=>{
  it('accounts for base64 expansion',()=>expect(estimateBase64Bytes(3)).toBe(4));
  it('rejects an encoded cumulative request above the safe budget',()=>expect(validateAttachmentSelection([{name:'a.pdf',size:8*1024*1024},{name:'b.pdf',size:8*1024*1024},{name:'c.pdf',size:8*1024*1024}]).valid).toBe(false));
  it('accepts a mixed selection below the budget',()=>expect(validateAttachmentSelection([{name:'a.pdf',size:2*1024*1024},{name:'b.jpg',size:2*1024*1024},{name:'c.webm',size:2*1024*1024}]).valid).toBe(true));
});
`);
write('src/test/atal-ai/contradictionGate.test.ts', `import { canApplyAtalDraft } from '@/src/features/atal-ai/domain/contradictionGate';
import type { AtalAIDraft } from '@/src/features/atal-ai/types';
const draft={contradictions:['La lateralidad no coincide.']} as AtalAIDraft;
describe('AI contradiction gate',()=>{it('blocks ordinary apply and permits an explicit override',()=>{expect(canApplyAtalDraft(draft)).toBe(false);expect(canApplyAtalDraft(draft,true)).toBe(true);});});
`);

replaceOnce('src/features/atal-ai/types.ts',
  "export type AIPlanDraft = {\n",
  "export type AIExerciseMutationMode = 'preserve' | 'append' | 'replace-one' | 'remove-one' | 'replace-all';\n\nexport type AIPlanDraft = {\n"
);
replaceOnce('src/features/atal-ai/types.ts',
  "  status: 'draft' | 'active';\n};",
  "  status: 'draft' | 'active';\n  exerciseMutation: { mode: AIExerciseMutationMode; targetExerciseId: string };\n};"
);
replaceOnce('src/features/atal-ai/api/schemas.ts',
  "      phases: stringArray, generalInstructions: { type: 'string' }, progressCriteria: { type: 'string' }, status: { type: 'string', enum: ['draft','active'] },\n    }, required: ['title','goal','focus','duration','frequency','phases','generalInstructions','progressCriteria','status'] },",
  "      phases: stringArray, generalInstructions: { type: 'string' }, progressCriteria: { type: 'string' }, status: { type: 'string', enum: ['draft','active'] },\n      exerciseMutation:{type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:['preserve','append','replace-one','remove-one','replace-all']},targetExerciseId:{type:'string'}},required:['mode','targetExerciseId']},\n    }, required: ['title','goal','focus','duration','frequency','phases','generalInstructions','progressCriteria','status','exerciseMutation'] },"
);
replaceOnce('src/features/atal-ai/api/schemas.ts',
  "plan: { title: text(plan.title), goal: text(plan.goal), focus: text(plan.focus), duration: { value: numberOrNull(duration.value), unit: ['days','weeks','months','custom'].includes(text(duration.unit)) ? text(duration.unit) as 'days'|'weeks'|'months'|'custom' : 'custom', customText: text(duration.customText) }, frequency: { value: numberOrNull(frequency.value), period: ['day','week','month','custom'].includes(text(frequency.period)) ? text(frequency.period) as 'day'|'week'|'month'|'custom' : 'custom', customText: text(frequency.customText) }, phases: list(plan.phases), generalInstructions: text(plan.generalInstructions), progressCriteria: text(plan.progressCriteria), status: plan.status === 'active' ? 'active' : 'draft' },",
  "plan: { title: text(plan.title), goal: text(plan.goal), focus: text(plan.focus), duration: { value: numberOrNull(duration.value), unit: ['days','weeks','months','custom'].includes(text(duration.unit)) ? text(duration.unit) as 'days'|'weeks'|'months'|'custom' : 'custom', customText: text(duration.customText) }, frequency: { value: numberOrNull(frequency.value), period: ['day','week','month','custom'].includes(text(frequency.period)) ? text(frequency.period) as 'day'|'week'|'month'|'custom' : 'custom', customText: text(frequency.customText) }, phases: list(plan.phases), generalInstructions: text(plan.generalInstructions), progressCriteria: text(plan.progressCriteria), status: plan.status === 'active' ? 'active' : 'draft', exerciseMutation:{mode:['append','replace-one','remove-one','replace-all'].includes(text((plan.exerciseMutation as Record<string,unknown>|undefined)?.mode))?text((plan.exerciseMutation as Record<string,unknown>).mode) as 'append'|'replace-one'|'remove-one'|'replace-all':'preserve',targetExerciseId:text((plan.exerciseMutation as Record<string,unknown>|undefined)?.targetExerciseId)} },"
);
replaceOnce('src/features/atal-ai/api/prompts.ts',
  "- Para planes incluye progressCriteria explícito cuando el profesional lo proporcione; no lo inventes.",
  "- Para planes incluye progressCriteria explícito cuando el profesional lo proporcione; no lo inventes.\n- Para actualizar ejercicios de un plan define siempre plan.exerciseMutation: preserve si no se pidió cambiar la rutina; append para añadir; replace-one o remove-one con targetExerciseId; replace-all únicamente cuando el profesional pida sustituir toda la rutina."
);
replaceOnce('src/features/atal-ai/data/applyDraft.ts',
  "import type { AIUndoToken,AtalAIDraft,PrivateContactDraft } from '../types';",
  "import type { AIUndoToken,AtalAIDraft,PrivateContactDraft } from '../types';\nimport { applyExerciseMutation } from '../domain/exerciseMutation';"
);
replaceOnce('src/features/atal-ai/data/applyDraft.ts',
  "metadata:{conversationId:string;draftId:string;force?:boolean}={conversationId:'',draftId:'',force:false}",
  "metadata:{conversationId:string;draftId:string;force?:boolean;contradictionOverride?:boolean}={conversationId:'',draftId:'',force:false,contradictionOverride:false}"
);
replaceOnce('src/features/atal-ai/data/applyDraft.ts',
  "changedFields:ai.proposedActions,conversationId:metadata.conversationId",
  "changedFields:[...ai.proposedActions,...(metadata.contradictionOverride?['contradiction-override']:[])],conversationId:metadata.conversationId"
);
replaceOnce('src/features/atal-ai/data/applyDraft.ts',
  "const exerciseIds:string[]=[];const requestedExercises=ai.intent==='update_patient_record'?[]:ai.exercises.filter((item)=>item.name.trim());",
  "const exerciseIds:string[]=[];const requestedExercises=ai.intent==='update_patient_record'||(ai.intent==='update_existing_plan'&&['preserve','remove-one'].includes(ai.plan.exerciseMutation.mode))?[]:ai.exercises.filter((item)=>item.name.trim());"
);
replaceOnce('src/features/atal-ai/data/applyDraft.ts',
  "if(exerciseIds.length)plan.exerciseIds=exerciseIds;",
  "plan.exerciseIds=applyExerciseMutation(plan.exerciseIds,exerciseIds,ai.plan.exerciseMutation);"
);

replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "import type { AIAttachmentPayload, AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest } from './types';",
  "import type { AIAttachmentPayload, AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest } from './types';\nimport { validateAttachmentSelection } from './domain/attachmentLimits';\nimport { canApplyAtalDraft } from './domain/contradictionGate';"
);
replaceRegex('src/features/atal-ai/AtalAIConversationScreen.tsx', /const MAX_FILES=8;\nconst MAX_FILE_SIZE=8\*1024\*1024;\n/, '');
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "const [confirm,setConfirm]=useState<'discard'|'restart'|'command'|null>(null);",
  "const [confirm,setConfirm]=useState<'discard'|'restart'|'command'|'contradictions'|null>(null);"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "const [forceApply,setForceApply]=useState(false);",
  "const [forceApply,setForceApply]=useState(false);const[contradictionOverride,setContradictionOverride]=useState(false);"
);
replaceRegex('src/features/atal-ai/AtalAIConversationScreen.tsx',
  /  const addFiles=async\(files:FileList\|File\[\]\)=>\{[\s\S]*?\n  \};/,
  `  const addFiles=async(files:FileList|File[])=>{
    const incoming=Array.from(files);const limit=validateAttachmentSelection(incoming,attachments);if(!limit.valid)return setNotice(limit.message);
    try{const converted:AIAttachmentPayload[]=[];for(const file of incoming){if(!allowedTypes.has(file.type)&&!file.type.startsWith('audio/'))throw new Error(file.name+': formato no compatible.');converted.push({id:uid('attachment'),name:file.name,type:file.type,size:file.size,kind:attachmentKind(file),available:true,data:await fileData(file)})}setAttachments((current)=>[...current,...converted]);setNotice('');patchConversation({status:'composing'})}catch(error){setNotice(error instanceof Error?error.message:'No pudimos adjuntar el archivo.')}
  };`
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "const addAudio=async(file:File)=>{try{",
  "const addAudio=async(file:File)=>{const limit=validateAttachmentSelection([file],attachments.filter((entry)=>entry.kind!=='audio'));if(!limit.valid){setNotice(limit.message);return;}try{"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "if(!draft)return;if(draft.responseMode==='command'",
  "if(!draft)return;if(!canApplyAtalDraft(draft,contradictionOverride)){setConfirm('contradictions');return;}if(draft.responseMode==='command'"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "force:forceApply});",
  "force:forceApply,contradictionOverride});"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "setConfirm(null);setForceApply(false)",
  "setConfirm(null);setForceApply(false);setContradictionOverride(false)"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "onKeepVersion={()=>setForceApply(true)}/>",
  "onKeepVersion={()=>setForceApply(true)} contradictionOverride={contradictionOverride}/>"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "onConfirm={()=>confirm==='discard'?discard():confirm==='restart'?restart():void performApply()}",
  "onConfirm={()=>confirm==='discard'?discard():confirm==='restart'?restart():confirm==='contradictions'?(setContradictionOverride(true),setConfirm(null)):void performApply()}"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  "function ConfirmDialog({kind,draft,onCancel,onConfirm}:{kind:'discard'|'restart'|'command';",
  "function ConfirmDialog({kind,draft,onCancel,onConfirm}:{kind:'discard'|'restart'|'command'|'contradictions';"
);
replaceOnce('src/features/atal-ai/AtalAIConversationScreen.tsx',
  ":[\'¿Aplicar esta acción?\',draft?.assistantMessage||\'La acción modificará datos reales de Atal y quedará registrada en el historial.\',\'Confirmar y aplicar\'];",
  ":kind==='contradictions'?['Revisar contradicciones','El borrador contiene información contradictoria. Solo continúa si ya la verificaste clínicamente. La excepción quedará registrada.','He revisado y continuar']:['¿Aplicar esta acción?',draft?.assistantMessage||'La acción modificará datos reales de Atal y quedará registrada en el historial.','Confirmar y aplicar'];"
);

replaceOnce('src/features/atal-ai/components/ConversationalDraftCard.tsx',
  "onKeepVersion:()=>void })",
  "onKeepVersion:()=>void;contradictionOverride?:boolean })"
);
replaceOnce('src/features/atal-ai/components/ConversationalDraftCard.tsx',
  "onChange,onApply,onReviewAll,onRefreshConflict,onCompare,onKeepVersion }:",
  "onChange,onApply,onReviewAll,onRefreshConflict,onCompare,onKeepVersion,contradictionOverride=false }:"
);
replaceOnce('src/features/atal-ai/components/ConversationalDraftCard.tsx',
  "disabled={applying||applied||Boolean(conflict)}",
  "disabled={applying||applied||Boolean(conflict)||(draft.contradictions.length>0&&!contradictionOverride)}"
);

replaceOnce('server/atalAIPlugin.ts',
  "import type { AtalAIAnalyzeRequest } from '../src/features/atal-ai/types';",
  "import type { AtalAIAnalyzeRequest } from '../src/features/atal-ai/types';\nimport { MAX_AI_REQUEST_BODY_BYTES } from '../src/features/atal-ai/domain/attachmentLimits';"
);
replaceOnce('server/atalAIPlugin.ts', 'const MAX_BODY_BYTES = 32 * 1024 * 1024;', 'const MAX_BODY_BYTES = MAX_AI_REQUEST_BODY_BYTES;');

replaceOnce('src/features/guided-session/planResolver.ts',
  "generalInstructions: `${localPlan.frequency || 'Frecuencia por definir'}. Respeta las indicaciones, realiza cada movimiento con calma y detente ante dolor fuerte.`,",
  "generalInstructions: localPlan.generalInstructions || `${localPlan.frequency || 'Frecuencia por definir'}. Respeta las indicaciones, realiza cada movimiento con calma y detente ante dolor fuerte.`,"
);

write('.github/workflows/quality.yml', `name: quality
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:run
      - run: npm run build
`);

write('docs/functional-qa/2026-07-20-foundation-checklist.md', `# Atal — Functional Foundation QA

## Automated gate

- [x] One canonical application export.
- [x] Empty real workspace and explicit demo initializer.
- [x] Clinical record / plan association domain tests.
- [x] Independent exercise and multimedia duplication tests.
- [x] Patient, plan and exercise validation tests.
- [x] Unsaved-change guard tests.
- [x] Atal IA exercise-mutation, contradiction and attachment-limit tests.
- [ ] GitHub Actions: typecheck.
- [ ] GitHub Actions: tests.
- [ ] GitHub Actions: production build.
- [ ] Rendered mobile regression review in IA Studio or ChatGPT Work.

## Protected visual baseline

The stylesheet import order in src/main.tsx, the approved dock, official green #7EB695, light mode and black dark mode are unchanged by this functional block.
`);

console.log('Functional foundation changes applied.');
