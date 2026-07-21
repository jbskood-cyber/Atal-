import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atal-patient-delivery-'));
const outputRoot = path.join(temporaryRoot, 'compiled');
const configPath = path.join(temporaryRoot, 'tsconfig.json');
let runtime;

function compileRuntime() {
  if (runtime) return runtime;

  const sourceFiles = [
    'src/features/patient-delivery/pdfWriter.ts',
    'src/features/patient-delivery/types.ts',
    'src/features/patient-delivery/deliveryActions.ts',
    'src/features/patient-delivery/deliveryOptions.ts',
    'src/features/patient-delivery/buildPatientPlanDocument.ts',
    'src/features/patient-delivery/pdfUniversalRenderer.ts',
  ].map((file) => path.join(repoRoot, file));

  fs.writeFileSync(configPath, JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'CommonJS',
      moduleResolution: 'Node',
      rootDir: repoRoot,
      outDir: outputRoot,
      baseUrl: repoRoot,
      paths: { '@/*': ['./*'] },
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: false,
      noEmitOnError: true,
    },
    files: sourceFiles,
  }, null, 2));

  const tscPath = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tscPath, '--project', configPath], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  const require = createRequire(import.meta.url);
  const compiled = (file) => path.join(outputRoot, 'src', 'features', 'patient-delivery', file);
  runtime = {
    options: require(compiled('deliveryOptions.js')),
    renderer: require(compiled('pdfUniversalRenderer.js')),
    writer: require(compiled('pdfWriter.js')),
    actions: require(compiled('deliveryActions.js')),
  };
  return runtime;
}

after(() => {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function repeated(prefix, count, marker) {
  return `${Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`).join(' ')} ${marker}`;
}

function universalDocument() {
  const exercise = (order) => ({
    id: `exercise-${order}`,
    order,
    name: repeated(`movimiento${order}-`, 22, `NOMBREFINAL${order}`),
    region: 'Rodilla',
    category: 'Fuerza terapéutica',
    objective: repeated(`objetivo-ejercicio${order}-`, 26, `OBJETIVOEJERCICIOFINAL${order}`),
    startingPosition: 'Posición estable y segura.',
    instructions: ['Realizar con control.'],
    precautions: 'Detener ante dolor fuerte.',
    equipment: `banda elástica y carga externa ${order + 4} kg`,
    sets: 4,
    repetitions: 12,
    duration: '35 segundos por lado',
    rest: repeated(`descanso${order}-`, 15, `DESCANSOFINAL${order}`),
    maxPain: 4,
    therapistNotes: repeated(`indicacion${order}-`, 34, `CLAVEFINAL${order}`),
    doseLabel: repeated(`dosis${order}-`, 28, `DOSISFINAL${order}`),
    media: { type: 'none' },
  });

  return {
    version: 1,
    generatedAt: '2026-07-21T12:00:00.000Z',
    patient: {
      id: 'patient-1',
      name: repeated('Nombre', 16, 'PACIENTEFINAL'),
      diagnosis: 'Dolor persistente de rodilla con limitación funcional',
      affectedArea: 'Rodilla derecha',
      phone: '+52 (444) 123-45-67',
      responsibleContact: 'Responsable Ana, 00 52 444 987 65 43',
    },
    professional: {
      name: 'Fisioterapeuta responsable',
      specialty: 'Fisioterapia musculoesquelética',
      clinic: 'Atal Fisioterapia',
    },
    plan: {
      id: 'plan-1',
      title: repeated('Plan', 14, 'PLANFINAL'),
      status: 'active',
      focus: 'Fuerza y tolerancia',
      objective: repeated('objetivo-terapeutico', 52, 'OBJETIVOPLANFINAL'),
      duration: 'Ocho semanas con ajuste según evolución clínica',
      frequency: 'Tres sesiones semanales y práctica domiciliaria según tolerancia',
      progression: 'Progresiva',
      reportCriteria: 'Dolor y adherencia',
      generalInstructions: 'Trabajar dentro de la tolerancia indicada.',
      updatedAt: '2026-07-21T11:00:00.000Z',
    },
    exercises: Array.from({ length: 6 }, (_, index) => exercise(index + 1)),
    delivery: {
      generatedLocally: true,
      publicLinkCreated: false,
      addressedDocument: true,
    },
  };
}

function pdfContains(pdfBytes, text, pdfHexString) {
  const encoded = pdfHexString(text).slice(1, -1);
  return Buffer.from(pdfBytes).toString('latin1').includes(encoded);
}

test('measures every wrapped clinical line instead of silently capping long exercise content', () => {
  const { options } = compileRuntime();
  const documentModel = universalDocument();
  const row = options.measurePatientPlanRow(documentModel.exercises[0], 'large');
  const logRow = options.measurePatientLogRow(documentModel.exercises[0], 'large');

  assert.ok(row.nameLines > 2, `expected more than 2 name lines, received ${row.nameLines}`);
  assert.ok(row.doseLines > 2, `expected more than 2 dose lines, received ${row.doseLines}`);
  assert.ok(row.restLines > 1, `expected more than 1 rest line, received ${row.restLines}`);
  assert.ok(row.cueLines > 2, `expected more than 2 instruction lines, received ${row.cueLines}`);
  assert.ok(logRow.nameLines > 2, `expected more than 2 log name lines, received ${logRow.nameLines}`);
  assert.ok(logRow.doseLines > 3, `expected more than 3 log dose lines, received ${logRow.doseLines}`);
});

test('renders long saved clinical content, keeps whole rows and matches the estimated PDF page count', () => {
  const { options, renderer, writer } = compileRuntime();
  const documentModel = universalDocument();
  const deliveryOptions = {
    mode: 'plan-and-log',
    fontScale: 'large',
    includeImages: false,
    sessionCount: 2,
  };

  const planPages = options.layoutPatientPlanPages(documentModel, deliveryOptions.fontScale);
  const renderedExerciseIds = planPages.flatMap((page) => page.rows.map((row) => row.exercise.id));
  assert.deepEqual(renderedExerciseIds, documentModel.exercises.map((exercise) => exercise.id));

  const estimate = options.estimatePatientPlanPages(documentModel, deliveryOptions);
  const result = renderer.renderUniversalPatientPlanPdf(documentModel, deliveryOptions);
  assert.equal(Buffer.from(result.bytes.subarray(0, 8)).toString('latin1'), '%PDF-1.4');
  assert.equal(result.pageCount, estimate.pageCount);
  assert.ok(result.pageCount > 3);

  for (const marker of [
    'PACIENTEFINAL',
    'PLANFINAL',
    'OBJETIVOPLANFINAL',
    'NOMBREFINAL1',
    'DOSISFINAL1',
    'DESCANSOFINAL1',
    'CLAVEFINAL1',
  ]) {
    assert.equal(pdfContains(result.bytes, marker, writer.pdfHexString), true, `missing ${marker} from rendered PDF`);
  }
});

test('normalizes WhatsApp recipients and preserves patient-first fallback behavior', () => {
  const { actions } = compileRuntime();
  assert.equal(actions.normalizeWhatsAppPhone('+52 (444) 123-45-67'), '524441234567');
  assert.equal(actions.normalizeWhatsAppPhone('Responsable Ana, 00 52 444 987.65.43'), '524449876543');
  assert.deepEqual(actions.resolvePatientWhatsAppTarget({
    id: 'patient-1',
    name: 'Paciente',
    diagnosis: '',
    affectedArea: '',
    phone: '+52 444 123 45 67',
    responsibleContact: 'Ana 00 52 444 987 65 43',
  }), {
    phone: '524441234567',
    source: 'patient',
    label: 'Paciente',
  });
  assert.equal(actions.resolvePatientWhatsAppTarget({
    id: 'patient-1',
    name: 'Paciente',
    diagnosis: '',
    affectedArea: '',
    phone: 'sin número',
    responsibleContact: 'Ana 00 52 444 987 65 43',
  })?.source, 'responsible');
});
