# Block 4.3A Capability Parity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an authoritative, machine-validated capability-parity matrix that identifies every manual Atal capability, its canonical implementation path, its current Atal IA coverage and the exact gaps that must be closed before agentic implementation begins.

**Architecture:** Keep audit data in a typed catalog under the existing Block 4.1 core so it compiles with the deterministic test harness. Merge the manual product inventory with current AI tool coverage, validate the catalog in Node tests, and generate a stable Markdown report for product review. This plan changes no runtime behavior and performs no clinical mutation.

**Tech Stack:** TypeScript 5.9, Node test runner, existing `tests/tsconfig.core.json` compilation, existing Atal tool registry, React/Vite repository, Markdown documentation.

## Global Constraints

- Canonical base: `main` at `6d9fd28bad4ae6f8cddcb4d0e11d3b36cd0d96ea`.
- Working branch: `feature/atal-ai-agentic-audit-block-4-3`.
- Preserve `atal:store:v2` and store version `2`.
- Preserve the Block 4.1 deterministic execution, policy, transaction, audit and undo machinery.
- Preserve the Block 4.2 global/contextual workspace behavior.
- Do not change application runtime behavior in this audit plan.
- Do not add dependencies.
- Do not expose `GEMINI_API_KEY` or any clinical store snapshot.
- Do not mark a capability complete solely because a similarly named AI command exists.
- Use TDD and focused commits.
- Keep the PR draft and unmerged until explicit user authorization.

---

## Locked file structure

- `src/features/atal-ai/core/audit/capabilityCatalog.ts` — audit types, validation and coverage summary.
- `src/features/atal-ai/core/audit/manualCapabilityInventory.ts` — one row for every manual capability in the current MVP.
- `src/features/atal-ai/core/audit/currentAICoverage.ts` — mapping from manual capabilities to existing read/action tools and current disposition.
- `src/features/atal-ai/core/audit/buildCapabilityAudit.ts` — deterministic merge of manual inventory and AI coverage.
- `tests/atal-ai-capability-parity.test.mjs` — integrity, completeness and known-gap regression tests.
- `scripts/atal-ai/generate-capability-report.mjs` — deterministic Markdown generator using the compiled audit modules.
- `docs/atal-ai/block-4-3/02-capability-audit-method.md` — audit rules and evidence standard.
- `docs/atal-ai/block-4-3/03-capability-parity-matrix.md` — generated matrix.
- `docs/atal-ai/block-4-3/04-current-state-audit.md` — human findings and product implications.
- `docs/atal-ai/block-4-3/05-gap-disposition.md` — ordered implementation work derived from the matrix.
- `package.json` — adds only the `audit:ai-capabilities` script.

---

### Task 1: Define the typed audit contract and validation rules

**Files:**
- Create: `src/features/atal-ai/core/audit/capabilityCatalog.ts`
- Create: `tests/atal-ai-capability-parity.test.mjs`

**Interfaces:**
- Produces: `ManualCapability`, `CapabilityAICoverage`, `CapabilityAuditRow`, `validateCapabilityAudit(rows)`, `summarizeCapabilityAudit(rows)`.
- Consumes: existing `ToolRisk` from `src/features/atal-ai/core/contracts.ts`.

- [ ] **Step 1: Write the failing contract test**

Create `tests/atal-ai-capability-parity.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const catalog = loadCore('src/features/atal-ai/core/audit/capabilityCatalog.js');

test('capability audit validation rejects duplicate ids and missing evidence', () => {
  const base = {
    id: 'patient.create',
    domain: 'patients',
    label: 'Crear paciente',
    route: '/patients/new',
    manualEntryPoint: 'src/data/atalStore.ts#createPatientWithRecord',
    canonicalPersistence: ['patients', 'clinicalRecords'],
    currentTests: ['tests/foundation.test.mjs'],
    readTools: [],
    actionTools: ['patient.create_with_record_and_plan'],
    coverage: 'covered',
    risk: 'reversible-write',
    confirmation: 'explicit-request',
    audit: 'transaction-event',
    undo: 'validated-receipt',
    multimodal: ['text', 'audio', 'image', 'pdf'],
    gap: '',
    disposition: 'keep',
  };

  assert.throws(
    () => catalog.validateCapabilityAudit([base, { ...base }]),
    /Duplicate capability id: patient\.create/,
  );

  assert.throws(
    () => catalog.validateCapabilityAudit([{ ...base, currentTests: [] }]),
    /Capability patient\.create has no test evidence/,
  );
});

test('capability audit summary counts every coverage class', () => {
  const rows = ['covered', 'partial', 'missing', 'excluded'].map((coverage, index) => ({
    id: `capability.${index}`,
    domain: 'patients',
    label: `Capability ${index}`,
    route: '/patients',
    manualEntryPoint: 'src/data/atalStore.ts#getAtalState',
    canonicalPersistence: ['patients'],
    currentTests: ['tests/foundation.test.mjs'],
    readTools: [],
    actionTools: [],
    coverage,
    risk: 'read',
    confirmation: 'none',
    audit: 'none',
    undo: 'not-applicable',
    multimodal: ['text'],
    gap: coverage === 'covered' ? '' : 'Known audit disposition.',
    disposition: coverage === 'excluded' ? 'exclude' : coverage === 'covered' ? 'keep' : 'build',
  }));

  assert.deepEqual(catalog.summarizeCapabilityAudit(rows), {
    total: 4,
    covered: 1,
    partial: 1,
    missing: 1,
    excluded: 1,
    parityPercent: 25,
  });
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: FAIL because `capabilityCatalog.js` does not exist.

- [ ] **Step 3: Implement the typed audit contract**

Create `src/features/atal-ai/core/audit/capabilityCatalog.ts`:

```ts
import type { ToolRisk } from '../contracts';

export type CapabilityDomain =
  | 'patients'
  | 'clinical-records'
  | 'plans'
  | 'exercises'
  | 'sessions'
  | 'reports-activity'
  | 'delivery-exports'
  | 'profile-settings'
  | 'navigation-assistance';

export type CapabilityCoverage = 'covered' | 'partial' | 'missing' | 'excluded';
export type CapabilityDisposition = 'keep' | 'build' | 'exclude';
export type ConfirmationBehavior = 'none' | 'explicit-request' | 'compact-review' | 'short-confirmation' | 'reinforced-confirmation' | 'blocked';
export type AuditBehavior = 'none' | 'activity-event' | 'transaction-event' | 'client-effect-only';
export type UndoBehavior = 'not-applicable' | 'validated-receipt' | 'manual-compensation' | 'not-supported';
export type MultimodalInput = 'text' | 'audio' | 'image' | 'pdf';

export type ManualCapability = {
  id: string;
  domain: CapabilityDomain;
  label: string;
  route: string;
  manualEntryPoint: string;
  canonicalPersistence: string[];
  currentTests: string[];
  risk: ToolRisk;
  confirmation: ConfirmationBehavior;
  audit: AuditBehavior;
  undo: UndoBehavior;
  multimodal: MultimodalInput[];
};

export type CapabilityAICoverage = {
  capabilityId: string;
  readTools: string[];
  actionTools: string[];
  coverage: CapabilityCoverage;
  gap: string;
  disposition: CapabilityDisposition;
};

export type CapabilityAuditRow = ManualCapability & Omit<CapabilityAICoverage, 'capabilityId'>;

export function validateCapabilityAudit(rows: CapabilityAuditRow[]): CapabilityAuditRow[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.id.trim()) throw new TypeError('Capability id is required.');
    if (ids.has(row.id)) throw new TypeError(`Duplicate capability id: ${row.id}`);
    ids.add(row.id);
    if (!row.label.trim()) throw new TypeError(`Capability ${row.id} has no label.`);
    if (!row.route.trim()) throw new TypeError(`Capability ${row.id} has no route.`);
    if (!row.manualEntryPoint.includes('#')) throw new TypeError(`Capability ${row.id} has no canonical entry point.`);
    if (!row.currentTests.length) throw new TypeError(`Capability ${row.id} has no test evidence.`);
    if (row.coverage !== 'covered' && !row.gap.trim()) throw new TypeError(`Capability ${row.id} requires an explicit gap.`);
    if (row.coverage === 'covered' && row.gap.trim()) throw new TypeError(`Capability ${row.id} is covered but still declares a gap.`);
    if (row.coverage === 'excluded' && row.disposition !== 'exclude') throw new TypeError(`Capability ${row.id} exclusion must use disposition exclude.`);
    if (row.coverage === 'covered' && row.disposition !== 'keep') throw new TypeError(`Capability ${row.id} coverage must use disposition keep.`);
  }
  return rows;
}

export function summarizeCapabilityAudit(rows: CapabilityAuditRow[]) {
  const counts = { covered: 0, partial: 0, missing: 0, excluded: 0 };
  for (const row of rows) counts[row.coverage] += 1;
  const total = rows.length;
  return {
    total,
    ...counts,
    parityPercent: total ? Math.round((counts.covered / total) * 100) : 0,
  };
}
```

- [ ] **Step 4: Compile and run the focused tests**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the audit contract**

```bash
git add src/features/atal-ai/core/audit/capabilityCatalog.ts tests/atal-ai-capability-parity.test.mjs
git commit -m "test: define Atal AI capability audit contract"
```

---

### Task 2: Inventory every manual capability in the current MVP

**Files:**
- Create: `src/features/atal-ai/core/audit/manualCapabilityInventory.ts`
- Modify: `tests/atal-ai-capability-parity.test.mjs`
- Create: `docs/atal-ai/block-4-3/02-capability-audit-method.md`

**Interfaces:**
- Consumes: `ManualCapability`.
- Produces: `manualCapabilityInventory: ManualCapability[]`.

- [ ] **Step 1: Add the failing inventory-integrity test**

Append to `tests/atal-ai-capability-parity.test.mjs`:

```js
const manual = loadCore('src/features/atal-ai/core/audit/manualCapabilityInventory.js');

test('manual capability inventory covers all product domains and protected flows', () => {
  const ids = new Set(manual.manualCapabilityInventory.map((item) => item.id));
  const domains = new Set(manual.manualCapabilityInventory.map((item) => item.domain));

  assert.equal(domains.size, 9);
  for (const id of [
    'patient.create',
    'patient.update-contact',
    'clinical-record.update',
    'plan.replace-active',
    'plan.reorder-exercises',
    'exercise.update-media',
    'session.complete',
    'report.review',
    'delivery.generate-pdf',
    'settings.update-ai-preferences',
    'navigation.open-contextual-assistant',
  ]) assert.equal(ids.has(id), true, `Missing manual capability ${id}`);

  assert.ok(manual.manualCapabilityInventory.length >= 50);
});
```

- [ ] **Step 2: Run the test and verify the inventory module is missing**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: FAIL because `manualCapabilityInventory.js` does not exist.

- [ ] **Step 3: Create the complete manual inventory**

Create `src/features/atal-ai/core/audit/manualCapabilityInventory.ts` using this helper and these exact capability ids:

```ts
import type { ManualCapability } from './capabilityCatalog';

const common = {
  confirmation: 'explicit-request' as const,
  audit: 'activity-event' as const,
  undo: 'manual-compensation' as const,
  multimodal: ['text', 'audio'] as const,
};

function capability(row: ManualCapability): ManualCapability {
  return Object.freeze(row);
}

export const manualCapabilityInventory: ManualCapability[] = [
  capability({ id: 'patient.list-search', domain: 'patients', label: 'Listar y buscar pacientes', route: '/patients', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['patients'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'patient.read', domain: 'patients', label: 'Consultar perfil de paciente', route: '/patients/:id', manualEntryPoint: 'src/screens/PatientProfileScreen.tsx#PatientProfileScreen', canonicalPersistence: ['patients', 'notes', 'plans', 'sessions'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'patient.create', domain: 'patients', label: 'Crear paciente y expediente inicial', route: '/patients/new', manualEntryPoint: 'src/data/atalStore.ts#createPatientWithRecord', canonicalPersistence: ['patients', 'clinicalRecords', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'patient.update-demographics', domain: 'patients', label: 'Actualizar datos generales del paciente', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePatient', canonicalPersistence: ['patients', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'patient.update-contact', domain: 'patients', label: 'Actualizar teléfono, correo, dirección y contacto responsable', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePatient', canonicalPersistence: ['patients', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'patient.archive-restore', domain: 'patients', label: 'Archivar o restaurar paciente', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#setPatientArchived', canonicalPersistence: ['patients', 'plans', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'patient-note.create', domain: 'patients', label: 'Añadir nota al paciente', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#addPatientNote', canonicalPersistence: ['notes', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'patient-note.update', domain: 'patients', label: 'Editar nota del paciente', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePatientNote', canonicalPersistence: ['notes'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'patient-note.delete', domain: 'patients', label: 'Eliminar nota del paciente', route: '/patients/:id', manualEntryPoint: 'src/data/atalStore.ts#deletePatientNote', canonicalPersistence: ['notes'], currentTests: ['tests/foundation.test.mjs'], risk: 'destructive', confirmation: 'reinforced-confirmation', audit: 'none', undo: 'not-supported', multimodal: ['text', 'audio'] }),

  capability({ id: 'clinical-record.read', domain: 'clinical-records', label: 'Consultar expediente clínico', route: '/patients/:id/clinical-record', manualEntryPoint: 'src/features/clinical-record/ClinicalRecordScreen.tsx#ClinicalRecordScreen', canonicalPersistence: ['clinicalRecords'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'clinical-record.create', domain: 'clinical-records', label: 'Crear expediente clínico', route: '/patients/:id/clinical-record', manualEntryPoint: 'src/data/atalStore.ts#saveClinicalRecord', canonicalPersistence: ['clinicalRecords', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'clinical-record.update', domain: 'clinical-records', label: 'Actualizar expediente y crear versión', route: '/patients/:id/clinical-record', manualEntryPoint: 'src/data/atalStore.ts#saveClinicalRecord', canonicalPersistence: ['clinicalRecords', 'clinicalRecordVersions', 'events'], currentTests: ['tests/clinical-record-pain-level.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'clinical-record.read-history', domain: 'clinical-records', label: 'Consultar versiones anteriores del expediente', route: '/patients/:id/clinical-record', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['clinicalRecordVersions'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),

  capability({ id: 'plan.list-search', domain: 'plans', label: 'Listar y filtrar planes', route: '/plans', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['plans'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.read', domain: 'plans', label: 'Consultar plan y prescripción', route: '/plans/:id', manualEntryPoint: 'src/screens/PlanDetailCloseoutScreen.tsx#PlanDetailCloseoutScreen', canonicalPersistence: ['plans', 'exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.create', domain: 'plans', label: 'Crear plan para paciente', route: '/plans/new', manualEntryPoint: 'src/data/atalStore.ts#createPlan', canonicalPersistence: ['plans', 'clinicalRecords', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'plan.update', domain: 'plans', label: 'Editar plan clínico', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlan', canonicalPersistence: ['plans', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'plan.duplicate', domain: 'plans', label: 'Duplicar plan como borrador', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#duplicatePlan', canonicalPersistence: ['plans', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.delete-safe', domain: 'plans', label: 'Eliminar plan sin sesiones', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#deletePlan', canonicalPersistence: ['plans'], currentTests: ['tests/foundation.test.mjs'], risk: 'destructive', confirmation: 'reinforced-confirmation', audit: 'none', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.activate', domain: 'plans', label: 'Activar plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlanStatus', canonicalPersistence: ['plans', 'events', 'notifications'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.pause', domain: 'plans', label: 'Pausar plan activo', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlanStatus', canonicalPersistence: ['plans', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.complete', domain: 'plans', label: 'Completar plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlanStatus', canonicalPersistence: ['plans', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.archive-restore', domain: 'plans', label: 'Archivar o restaurar plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlanStatus', canonicalPersistence: ['plans', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.replace-active', domain: 'plans', label: 'Reemplazar plan activo de forma atómica', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlanStatus', canonicalPersistence: ['plans', 'events', 'notifications'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.add-exercises', domain: 'plans', label: 'Añadir ejercicios al plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlan', canonicalPersistence: ['plans'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'plan.remove-exercises', domain: 'plans', label: 'Retirar ejercicios del plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlan', canonicalPersistence: ['plans'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'plan.reorder-exercises', domain: 'plans', label: 'Reordenar ejercicios del plan', route: '/plans/:id', manualEntryPoint: 'src/data/atalStore.ts#updatePlan', canonicalPersistence: ['plans'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),

  capability({ id: 'exercise.list-search', domain: 'exercises', label: 'Listar, buscar y filtrar ejercicios', route: '/exercises', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio', 'image'] }),
  capability({ id: 'exercise.read', domain: 'exercises', label: 'Consultar ejercicio y prescripción', route: '/exercises/:id', manualEntryPoint: 'src/screens/ExerciseDetailScreen.tsx#ExerciseDetailScreen', canonicalPersistence: ['exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio', 'image'] }),
  capability({ id: 'exercise.create', domain: 'exercises', label: 'Crear ejercicio', route: '/exercises/new', manualEntryPoint: 'src/data/atalStore.ts#createExercise', canonicalPersistence: ['exercises', 'events'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'exercise.update', domain: 'exercises', label: 'Editar ejercicio', route: '/exercises/:id', manualEntryPoint: 'src/data/atalStore.ts#updateExercise', canonicalPersistence: ['exercises'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'exercise.duplicate', domain: 'exercises', label: 'Duplicar ejercicio', route: '/exercises/:id', manualEntryPoint: 'src/data/atalStore.ts#duplicateExercise', canonicalPersistence: ['exercises', 'events'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'exercise.archive-restore', domain: 'exercises', label: 'Archivar o restaurar ejercicio', route: '/exercises/:id', manualEntryPoint: 'src/data/atalStore.ts#archiveExercise', canonicalPersistence: ['exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'exercise.delete-safe', domain: 'exercises', label: 'Eliminar ejercicio no asociado', route: '/exercises/:id', manualEntryPoint: 'src/data/atalStore.ts#deleteExercise', canonicalPersistence: ['exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'destructive', confirmation: 'reinforced-confirmation', audit: 'none', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'exercise.update-media', domain: 'exercises', label: 'Añadir o sustituir multimedia del ejercicio', route: '/exercises/:id', manualEntryPoint: 'src/features/exercises/mediaRepository.ts#saveExerciseMedia', canonicalPersistence: ['exercises', 'IndexedDB media'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: 'compact-review', audit: 'none', undo: common.undo, multimodal: ['image'] }),

  capability({ id: 'session.prepare', domain: 'sessions', label: 'Preparar sesión guiada desde plan activo', route: '/patients/:id/session', manualEntryPoint: 'src/features/guided-session/SessionPreparation.tsx#SessionPreparation', canonicalPersistence: ['guided session draft'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'session.start-resume', domain: 'sessions', label: 'Iniciar o reanudar sesión guiada', route: '/patients/:id/session', manualEntryPoint: 'src/data/atalStore.ts#recordSessionStarted', canonicalPersistence: ['events', 'guided session draft'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'session.record-exercise-result', domain: 'sessions', label: 'Registrar resultado de cada ejercicio', route: '/patients/:id/session', manualEntryPoint: 'src/features/guided-session/GuidedSessionFlow.tsx#GuidedSessionFlow', canonicalPersistence: ['guided session draft'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio', 'image'] }),
  capability({ id: 'session.record-symptoms', domain: 'sessions', label: 'Registrar dolor, energía, esfuerzo y síntomas', route: '/patients/:id/session', manualEntryPoint: 'src/features/guided-session/GuidedSessionFlow.tsx#GuidedSessionFlow', canonicalPersistence: ['guided session draft'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'session.complete', domain: 'sessions', label: 'Completar o guardar sesión parcial', route: '/patients/:id/session', manualEntryPoint: 'src/data/atalStore.ts#saveCompletedSession', canonicalPersistence: ['sessions', 'events', 'notifications'], currentTests: ['tests/foundation.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: common.audit, undo: 'not-supported', multimodal: ['text', 'audio'] }),

  capability({ id: 'report.list', domain: 'reports-activity', label: 'Listar actividad y reportes', route: '/activity', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['events', 'sessions'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'report.read', domain: 'reports-activity', label: 'Consultar reporte clínico de sesión', route: '/activity/:id', manualEntryPoint: 'src/screens/ActivityDetailScreen.tsx#ActivityDetailScreen', canonicalPersistence: ['sessions'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'report.prepare-summary', domain: 'reports-activity', label: 'Preparar resumen de sesión', route: '/activity/:id', manualEntryPoint: 'src/features/atal-ai/core/tools/queryTools.ts#report.prepare_session_summary', canonicalPersistence: ['sessions'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'report.review', domain: 'reports-activity', label: 'Revisar reporte y guardar observación clínica', route: '/activity/:id', manualEntryPoint: 'src/data/atalStore.ts#reviewSession', canonicalPersistence: ['sessions', 'events', 'notifications'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'activity.read-audit', domain: 'reports-activity', label: 'Consultar historial y auditoría de Atal IA', route: '/activity', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['events'], currentTests: ['tests/atal-ai-core-transaction.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),

  capability({ id: 'delivery.preview', domain: 'delivery-exports', label: 'Previsualizar entrega del plan', route: '/plans/:id/delivery', manualEntryPoint: 'src/screens/PatientPlanDeliveryScreen.tsx#PatientPlanDeliveryScreen', canonicalPersistence: ['plans', 'patients', 'exercises'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'delivery.configure', domain: 'delivery-exports', label: 'Configurar plan, registro y sesiones', route: '/plans/:id/delivery', manualEntryPoint: 'src/features/patient-delivery/deliveryConfiguration.ts#normalizeDeliveryConfiguration', canonicalPersistence: ['delivery draft'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'delivery.generate-pdf', domain: 'delivery-exports', label: 'Generar PDF local', route: '/plans/:id/delivery', manualEntryPoint: 'src/features/patient-delivery/pdf/generatePatientPlanPdf.ts#generatePatientPlanPdf', canonicalPersistence: ['local file'], currentTests: ['tests/foundation.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'delivery.download-print-share', domain: 'delivery-exports', label: 'Descargar, imprimir o compartir PDF', route: '/plans/:id/delivery', manualEntryPoint: 'src/screens/PatientPlanDeliveryScreen.tsx#PatientPlanDeliveryScreen', canonicalPersistence: ['local file'], currentTests: ['tests/foundation.test.mjs'], risk: 'external', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'delivery.prepare-whatsapp', domain: 'delivery-exports', label: 'Preparar apertura de WhatsApp con mensaje', route: '/plans/:id/delivery', manualEntryPoint: 'src/features/patient-delivery/whatsapp.ts#createWhatsAppDeliveryUrl', canonicalPersistence: ['none'], currentTests: ['tests/foundation.test.mjs'], risk: 'external', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'export.patients', domain: 'delivery-exports', label: 'Exportar pacientes', route: '/exports', manualEntryPoint: 'src/features/atal-ai/core/tools/exportTools.ts#data.export_local', canonicalPersistence: ['local file'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'export.progress', domain: 'delivery-exports', label: 'Exportar progreso', route: '/exports', manualEntryPoint: 'src/features/atal-ai/core/tools/exportTools.ts#data.export_local', canonicalPersistence: ['local file'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),
  capability({ id: 'export.plans-backup', domain: 'delivery-exports', label: 'Exportar planes o respaldo local', route: '/exports', manualEntryPoint: 'src/features/atal-ai/core/tools/exportTools.ts#data.export_local', canonicalPersistence: ['local file'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'sensitive-write', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio'] }),

  capability({ id: 'settings.read', domain: 'profile-settings', label: 'Consultar preferencias y perfil profesional', route: '/settings', manualEntryPoint: 'src/data/atalStore.ts#getAtalState', canonicalPersistence: ['settings'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'settings.update-profile', domain: 'profile-settings', label: 'Actualizar perfil profesional', route: '/settings/profile', manualEntryPoint: 'src/data/atalStore.ts#updateSettings', canonicalPersistence: ['settings'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio', 'image'] }),
  capability({ id: 'settings.update-privacy', domain: 'profile-settings', label: 'Actualizar privacidad y bloqueo de sesión', route: '/settings/privacy', manualEntryPoint: 'src/data/atalStore.ts#updateSettings', canonicalPersistence: ['settings'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: common.audit, undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'settings.update-appearance', domain: 'profile-settings', label: 'Actualizar apariencia y densidad', route: '/settings/appearance', manualEntryPoint: 'src/context/ThemeContext.tsx#setTheme', canonicalPersistence: ['theme preference', 'settings'], currentTests: ['tests/foundation.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'none', undo: common.undo, multimodal: ['text', 'audio'] }),
  capability({ id: 'settings.update-ai-preferences', domain: 'profile-settings', label: 'Actualizar preferencias de Atal IA', route: '/settings/ai', manualEntryPoint: 'src/data/atalStore.ts#updateSettings', canonicalPersistence: ['settings'], currentTests: ['tests/atal-ai-core-tools.test.mjs'], risk: 'reversible-write', confirmation: common.confirmation, audit: 'transaction-event', undo: 'validated-receipt', multimodal: ['text', 'audio'] }),
  capability({ id: 'feedback.prepare-share', domain: 'profile-settings', label: 'Preparar y compartir comentario', route: '/settings/feedback', manualEntryPoint: 'src/data/atalStore.ts#addFeedback', canonicalPersistence: ['feedback'], currentTests: ['tests/foundation.test.mjs'], risk: 'external', confirmation: 'short-confirmation', audit: 'client-effect-only', undo: 'not-supported', multimodal: ['text', 'audio', 'image'] }),

  capability({ id: 'navigation.open-screen', domain: 'navigation-assistance', label: 'Abrir una pantalla o entidad solicitada', route: '*', manualEntryPoint: 'src/AppCloseout.tsx#PrivateAppRoutes', canonicalPersistence: ['none'], currentTests: ['e2e/block-4-1-critical.spec.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio'] }),
  capability({ id: 'navigation.open-contextual-assistant', domain: 'navigation-assistance', label: 'Abrir Atal IA con contexto actual', route: '*', manualEntryPoint: 'src/features/atal-ai/contextual/ContextualAIProvider.tsx#ContextualAIProvider', canonicalPersistence: ['AI conversations'], currentTests: ['e2e/block-4-2-contextual.spec.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio', 'image', 'pdf'] }),
  capability({ id: 'assistant.resume-task', domain: 'navigation-assistance', label: 'Reanudar conversación y tarea pendiente', route: '/assistant', manualEntryPoint: 'src/features/atal-ai/data/aiRepository.ts#getLatestAIConversation', canonicalPersistence: ['AI conversations', 'AI drafts'], currentTests: ['tests/foundation.test.mjs'], risk: 'read', confirmation: 'none', audit: 'none', undo: 'not-applicable', multimodal: ['text', 'audio', 'image', 'pdf'] }),
];
```

- [ ] **Step 4: Document the audit evidence rules**

Create `docs/atal-ai/block-4-3/02-capability-audit-method.md` with:

```markdown
# Block 4.3 — Capability audit method

## Evidence hierarchy

A capability exists only when all of the following are identifiable:

1. a user-visible manual operation;
2. a canonical code entry point;
3. persisted state or a deliberate client effect;
4. at least one current automated test or an explicit evidence gap;
5. an exact AI read/action path or an explicit missing/excluded classification.

A similarly named intent, prompt phrase or visual control is not evidence of functional AI parity.

## Coverage classes

- `covered`: AI can complete the same outcome through canonical paths.
- `partial`: AI covers only part of the manual outcome or lacks persistence, context, audit, undo or multimodal behavior.
- `missing`: no matching AI path exists.
- `excluded`: intentionally unavailable in Block 4.3 with a product reason.

## Review rules

- Validate file paths against the current branch.
- Validate tool names against `atalAIToolRegistry.list()`.
- Validate persistence against `AtalState`, local repositories and approved client effects.
- Validate confirmation against the deterministic risk policy, not model output.
- Record a concrete gap for every non-covered row.
- Do not improve the product while performing this inventory.
```

- [ ] **Step 5: Compile and run the focused tests**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: 3 tests PASS and inventory length at least 50.

- [ ] **Step 6: Commit the manual inventory**

```bash
git add src/features/atal-ai/core/audit/manualCapabilityInventory.ts tests/atal-ai-capability-parity.test.mjs docs/atal-ai/block-4-3/02-capability-audit-method.md
git commit -m "docs: inventory current Atal product capabilities"
```

---

### Task 3: Map current Atal IA coverage without inflating parity

**Files:**
- Create: `src/features/atal-ai/core/audit/currentAICoverage.ts`
- Create: `src/features/atal-ai/core/audit/buildCapabilityAudit.ts`
- Modify: `tests/atal-ai-capability-parity.test.mjs`

**Interfaces:**
- Consumes: `manualCapabilityInventory`, `atalAIToolRegistry.list()`.
- Produces: `currentAICoverage`, `buildCapabilityAudit()`, `capabilityAuditRows`.

- [ ] **Step 1: Add failing known-coverage and known-gap tests**

Append:

```js
const audit = loadCore('src/features/atal-ai/core/audit/buildCapabilityAudit.js');

test('current audit recognizes covered core tools and real missing parity', () => {
  const rows = audit.buildCapabilityAudit();
  const byId = new Map(rows.map((row) => [row.id, row]));

  assert.equal(byId.get('patient-note.create').coverage, 'covered');
  assert.deepEqual(byId.get('patient-note.create').actionTools, ['patient_note.add']);
  assert.equal(byId.get('plan.replace-active').coverage, 'covered');
  assert.equal(byId.get('exercise.update-media').coverage, 'missing');
  assert.equal(byId.get('session.complete').coverage, 'missing');
  assert.equal(byId.get('delivery.generate-pdf').coverage, 'missing');
  assert.equal(byId.get('clinical-record.update').coverage, 'covered');
  assert.equal(byId.get('report.review').coverage, 'missing');
});

test('every declared AI tool exists in the current registry', () => {
  const execution = loadCore('src/features/atal-ai/core/executionEngine.js');
  const registered = new Set(execution.atalAIToolRegistry.list().map((tool) => tool.name));
  for (const row of audit.buildCapabilityAudit()) {
    for (const tool of [...row.readTools, ...row.actionTools]) {
      assert.equal(registered.has(tool), true, `${row.id} references unregistered tool ${tool}`);
    }
  }
});
```

- [ ] **Step 2: Run tests and verify the coverage modules are missing**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: FAIL because `buildCapabilityAudit.js` does not exist.

- [ ] **Step 3: Define the current coverage map**

Create `src/features/atal-ai/core/audit/currentAICoverage.ts`:

```ts
import type { CapabilityAICoverage } from './capabilityCatalog';

const covered = (capabilityId: string, readTools: string[] = [], actionTools: string[] = []): CapabilityAICoverage => ({ capabilityId, readTools, actionTools, coverage: 'covered', gap: '', disposition: 'keep' });
const partial = (capabilityId: string, gap: string, readTools: string[] = [], actionTools: string[] = []): CapabilityAICoverage => ({ capabilityId, readTools, actionTools, coverage: 'partial', gap, disposition: 'build' });
const missing = (capabilityId: string, gap: string): CapabilityAICoverage => ({ capabilityId, readTools: [], actionTools: [], coverage: 'missing', gap, disposition: 'build' });
const excluded = (capabilityId: string, gap: string): CapabilityAICoverage => ({ capabilityId, readTools: [], actionTools: [], coverage: 'excluded', gap, disposition: 'exclude' });

export const currentAICoverage: CapabilityAICoverage[] = [
  covered('patient.list-search', ['patient.search']),
  partial('patient.read', 'Current patient summary omits complete notes, session history, contact and record versions.', ['patient.summarize']),
  covered('patient.create', [], ['patient.create_with_record_and_plan']),
  partial('patient.update-demographics', 'The draft path updates only selected demographic and clinical fields.', [], ['patient_record.update']),
  missing('patient.update-contact', 'No AI tool updates canonical patient contact fields.'),
  missing('patient.archive-restore', 'No patient archive or restore tool is registered.'),
  covered('patient-note.create', [], ['patient_note.add']),
  missing('patient-note.update', 'No note update tool is registered.'),
  excluded('patient-note.delete', 'Destructive note deletion remains unavailable until a validated undo or retention policy exists.'),

  partial('clinical-record.read', 'Patient summary does not expose the complete canonical record.', ['patient.summarize']),
  partial('clinical-record.create', 'Creation exists only as part of combined patient and plan creation.', [], ['patient.create_with_record_and_plan']),
  covered('clinical-record.update', [], ['patient_record.update']),
  missing('clinical-record.read-history', 'No read tool exposes clinical record versions.'),

  missing('plan.list-search', 'No typed plan listing or search tool exists.'),
  partial('plan.read', 'Patient summary exposes only the active plan headline.', ['patient.summarize']),
  covered('plan.create', [], ['plan.create_for_patient']),
  partial('plan.update', 'Update adds materialized exercises but does not expose explicit remove or reorder operations.', [], ['plan.update']),
  missing('plan.duplicate', 'No plan duplicate tool exists.'),
  excluded('plan.delete-safe', 'Permanent plan deletion remains blocked; archive is the supported agent action.'),
  covered('plan.activate', [], ['plan.activate']),
  covered('plan.pause', [], ['plan.pause']),
  covered('plan.complete', [], ['plan.complete']),
  covered('plan.archive-restore', [], ['plan.archive', 'plan.restore']),
  covered('plan.replace-active', [], ['plan.replace_active']),
  partial('plan.add-exercises', 'Plan update can add exercises but lacks explicit membership semantics.', [], ['plan.update']),
  missing('plan.remove-exercises', 'No plan membership removal tool exists.'),
  missing('plan.reorder-exercises', 'No plan exercise reorder tool exists.'),

  missing('exercise.list-search', 'No typed exercise search/list tool exists.'),
  missing('exercise.read', 'No typed exercise detail read tool exists.'),
  covered('exercise.create', [], ['exercise.create']),
  covered('exercise.update', [], ['exercise.update']),
  missing('exercise.duplicate', 'No exercise duplicate tool exists.'),
  missing('exercise.archive-restore', 'No exercise archive or restore tool exists.'),
  excluded('exercise.delete-safe', 'Permanent exercise deletion remains unavailable through Atal IA.'),
  missing('exercise.update-media', 'No tool uses the canonical local media repository.'),

  missing('session.prepare', 'No read tool assembles the active session snapshot.'),
  missing('session.start-resume', 'No agent tool starts or resumes a guided session.'),
  missing('session.record-exercise-result', 'No agent tool writes guided-session exercise outcomes.'),
  missing('session.record-symptoms', 'No agent tool writes pain, effort, energy or symptoms.'),
  missing('session.complete', 'No agent tool completes or persists a session.'),

  partial('report.list', 'Recent-session summary is patient-scoped and does not list activity or audit history.', ['session.summarize_recent']),
  partial('report.read', 'Session summary returns a limited sentence instead of complete report data.', ['report.prepare_session_summary']),
  covered('report.prepare-summary', ['report.prepare_session_summary']),
  missing('report.review', 'No tool persists the physiotherapist review or clinical observation.'),
  missing('activity.read-audit', 'No tool queries transaction and activity audit entries.'),

  missing('delivery.preview', 'No tool builds the patient-delivery read model.'),
  missing('delivery.configure', 'No tool persists delivery configuration.'),
  missing('delivery.generate-pdf', 'No tool invokes the canonical local PDF generator.'),
  missing('delivery.download-print-share', 'No approved client-effect tool exposes delivery actions.'),
  excluded('delivery.prepare-whatsapp', 'Automatic or external messaging remains excluded; a separately confirmed URL-opening client effect may be evaluated later.'),
  covered('export.patients', [], ['data.export_local']),
  covered('export.progress', [], ['data.export_local']),
  covered('export.plans-backup', [], ['data.export_local']),

  missing('settings.read', 'No typed read tool returns profile and settings.'),
  partial('settings.update-profile', 'The existing settings tool intentionally excludes professional profile fields.', [], ['settings.update']),
  covered('settings.update-privacy', [], ['settings.update']),
  partial('settings.update-appearance', 'Theme selection is not represented by the current settings tool.', [], ['settings.update']),
  covered('settings.update-ai-preferences', [], ['settings.update']),
  excluded('feedback.prepare-share', 'External feedback sharing is outside the clinical agent parity target.'),

  missing('navigation.open-screen', 'No navigation client-effect tool resolves and opens routes.'),
  covered('navigation.open-contextual-assistant'),
  partial('assistant.resume-task', 'Conversation and draft persist, but multi-step execution checkpoints and attachment artifacts do not.', [], []),
];
```

- [ ] **Step 4: Merge and validate the audit rows**

Create `src/features/atal-ai/core/audit/buildCapabilityAudit.ts`:

```ts
import { atalAIToolRegistry } from '../executionEngine';
import { validateCapabilityAudit, type CapabilityAuditRow } from './capabilityCatalog';
import { currentAICoverage } from './currentAICoverage';
import { manualCapabilityInventory } from './manualCapabilityInventory';

export function buildCapabilityAudit(): CapabilityAuditRow[] {
  const coverage = new Map(currentAICoverage.map((item) => [item.capabilityId, item]));
  const registered = new Set(atalAIToolRegistry.list().map((tool) => tool.name));
  const rows = manualCapabilityInventory.map((manual) => {
    const mapped = coverage.get(manual.id);
    if (!mapped) throw new TypeError(`Missing AI coverage classification: ${manual.id}`);
    for (const tool of [...mapped.readTools, ...mapped.actionTools]) {
      if (!registered.has(tool)) throw new TypeError(`Capability ${manual.id} references unregistered tool ${tool}`);
    }
    const { capabilityId: _capabilityId, ...ai } = mapped;
    return { ...manual, ...ai };
  });
  if (coverage.size !== rows.length) {
    const manualIds = new Set(rows.map((row) => row.id));
    const orphan = currentAICoverage.find((item) => !manualIds.has(item.capabilityId));
    if (orphan) throw new TypeError(`AI coverage references unknown capability: ${orphan.capabilityId}`);
  }
  return validateCapabilityAudit(rows);
}

export const capabilityAuditRows = buildCapabilityAudit();
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: all capability parity tests PASS.

- [ ] **Step 6: Commit the AI coverage audit**

```bash
git add src/features/atal-ai/core/audit/currentAICoverage.ts src/features/atal-ai/core/audit/buildCapabilityAudit.ts tests/atal-ai-capability-parity.test.mjs
git commit -m "test: classify current Atal AI capability parity"
```

---

### Task 4: Generate the stable human-readable parity matrix

**Files:**
- Create: `scripts/atal-ai/generate-capability-report.mjs`
- Modify: `package.json`
- Generate: `docs/atal-ai/block-4-3/03-capability-parity-matrix.md`
- Modify: `tests/atal-ai-capability-parity.test.mjs`

**Interfaces:**
- Consumes: compiled `capabilityAuditRows` and `summarizeCapabilityAudit`.
- Produces: deterministic Markdown with totals and one row per manual capability.

- [ ] **Step 1: Add failing stable-order and coverage-total tests**

Append:

```js
test('capability audit has deterministic order and complete classification', () => {
  const rows = audit.buildCapabilityAudit();
  const ids = rows.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(rows.every((row) => ['covered', 'partial', 'missing', 'excluded'].includes(row.coverage)));
  assert.ok(rows.some((row) => row.coverage === 'covered'));
  assert.ok(rows.some((row) => row.coverage === 'partial'));
  assert.ok(rows.some((row) => row.coverage === 'missing'));
  assert.ok(rows.some((row) => row.coverage === 'excluded'));
});
```

- [ ] **Step 2: Create the report generator**

Create `scripts/atal-ai/generate-capability-report.mjs`:

```js
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const audit = require(resolve(root, '.tmp/core-tests/src/features/atal-ai/core/audit/buildCapabilityAudit.js'));
const catalog = require(resolve(root, '.tmp/core-tests/src/features/atal-ai/core/audit/capabilityCatalog.js'));
const rows = audit.buildCapabilityAudit();
const summary = catalog.summarizeCapabilityAudit(rows);
const cell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  '# Block 4.3 — Capability parity matrix',
  '',
  `Generated from branch \`feature/atal-ai-agentic-audit-block-4-3\`.`,
  '',
  '## Summary',
  '',
  `- Total manual capabilities: **${summary.total}**`,
  `- Covered: **${summary.covered}**`,
  `- Partial: **${summary.partial}**`,
  `- Missing: **${summary.missing}**`,
  `- Excluded: **${summary.excluded}**`,
  `- Current full-parity percentage: **${summary.parityPercent}%**`,
  '',
  'The percentage counts only capabilities classified as fully covered. Partial capabilities remain implementation work.',
  '',
  '## Matrix',
  '',
  '| ID | Domain | Manual capability | Route | Canonical path | Persistence | AI reads | AI actions | Coverage | Risk | Confirmation | Audit | Undo | Gap / disposition |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((row) => `| ${cell(row.id)} | ${cell(row.domain)} | ${cell(row.label)} | ${cell(row.route)} | ${cell(row.manualEntryPoint)} | ${cell(row.canonicalPersistence.join(', '))} | ${cell(row.readTools.join(', ') || '—')} | ${cell(row.actionTools.join(', ') || '—')} | ${cell(row.coverage)} | ${cell(row.risk)} | ${cell(row.confirmation)} | ${cell(row.audit)} | ${cell(row.undo)} | ${cell(row.gap || row.disposition)} |`),
  '',
  '## Interpretation',
  '',
  '- `covered` means the current AI path reaches the same canonical outcome with the required safeguards.',
  '- `partial` means an existing path omits part of the manual outcome or required persistence/safety behavior.',
  '- `missing` means a new read or action tool is required.',
  '- `excluded` means the current product deliberately does not expose the operation to Atal IA.',
  '',
];
const output = resolve(root, 'docs/atal-ai/block-4-3/03-capability-parity-matrix.md');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${output}`);
console.log(JSON.stringify(summary));
```

- [ ] **Step 3: Add the package script**

Modify `package.json` scripts by adding:

```json
"audit:ai-capabilities": "npm run test:core:compile && node scripts/atal-ai/generate-capability-report.mjs"
```

Do not change dependency versions or the lockfile.

- [ ] **Step 4: Generate the matrix**

Run:

```bash
npm run audit:ai-capabilities
```

Expected:

```text
Wrote .../docs/atal-ai/block-4-3/03-capability-parity-matrix.md
{"total":<number>,"covered":<number>,"partial":<number>,"missing":<number>,"excluded":<number>,"parityPercent":<number>}
```

The total must be at least 50 and equal the number of table rows.

- [ ] **Step 5: Run focused tests and verify deterministic regeneration**

Run:

```bash
npm run audit:ai-capabilities
git diff --exit-code -- docs/atal-ai/block-4-3/03-capability-parity-matrix.md
npm test -- --test-name-pattern="capability audit"
```

Expected: generated matrix unchanged and capability tests PASS.

- [ ] **Step 6: Commit the generator and matrix**

```bash
git add package.json scripts/atal-ai/generate-capability-report.mjs docs/atal-ai/block-4-3/03-capability-parity-matrix.md tests/atal-ai-capability-parity.test.mjs
git commit -m "docs: generate Atal AI capability parity matrix"
```

---

### Task 5: Verify canonical paths and write the current-state audit

**Files:**
- Create: `docs/atal-ai/block-4-3/04-current-state-audit.md`
- Modify when evidence requires correction: `src/features/atal-ai/core/audit/manualCapabilityInventory.ts`
- Modify when evidence requires correction: `src/features/atal-ai/core/audit/currentAICoverage.ts`
- Regenerate: `docs/atal-ai/block-4-3/03-capability-parity-matrix.md`

**Interfaces:**
- Consumes: routes, store exports, media repository, guided session, delivery modules, tool registry and tests.
- Produces: a source-backed diagnosis of current readiness.

- [ ] **Step 1: Verify every declared manual entry point**

Run these exact searches from the repository root:

```bash
rg -n "export function|export const|function [A-Z]" src/data/atalStore.ts src/AppCloseout.tsx src/screens src/features/guided-session src/features/clinical-record src/features/patient-delivery src/features/atal-ai | tee /tmp/atal-capability-entry-points.txt
rg -n "createPatient|updatePatient|setPatientArchived|addPatientNote|updatePatientNote|deletePatientNote|createPlan|updatePlan|updatePlanStatus|duplicatePlan|deletePlan|createExercise|updateExercise|duplicateExercise|archiveExercise|deleteExercise|saveClinicalRecord|saveCompletedSession|recordSessionStarted|reviewSession|updateSettings" src | tee /tmp/atal-store-call-sites.txt
rg -n "saveExerciseMedia|generatePatientPlanPdf|createWhatsAppDeliveryUrl|navigator\.share|window\.print|download" src | tee /tmp/atal-client-effects.txt
```

Expected: every `manualEntryPoint` resolves to a current file and symbol. Correct the inventory immediately when a path or symbol is inaccurate.

- [ ] **Step 2: Verify every current test reference**

Run:

```bash
node - <<'NODE'
const { readFileSync, existsSync } = require('node:fs');
const text = readFileSync('src/features/atal-ai/core/audit/manualCapabilityInventory.ts', 'utf8');
const refs = [...text.matchAll(/'((?:tests|e2e)\/[^']+)'/g)].map((match) => match[1]);
const missing = [...new Set(refs)].filter((path) => !existsSync(path));
if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}
console.log(`Verified ${new Set(refs).size} evidence files.`);
NODE
```

Expected: exit code 0.

- [ ] **Step 3: Verify tool coverage against the current registry and prompt**

Run:

```bash
rg -n "name: '[a-z0-9_.]+'" src/features/atal-ai/core/tools
rg -n "AtalAIIntent|AICommandType|Interpreta la intención" src/features/atal-ai/types.ts src/features/atal-ai/api/prompts.ts
npm run test:core:compile
node - <<'NODE'
const engine = require('./.tmp/core-tests/src/features/atal-ai/core/executionEngine.js');
console.log(engine.atalAIToolRegistry.list().map((tool) => `${tool.name}\t${tool.risk}\t${tool.mutates}`).join('\n'));
NODE
```

Expected: the matrix references only tool names printed by the registry.

- [ ] **Step 4: Write the current-state audit with exact findings**

Create `docs/atal-ai/block-4-3/04-current-state-audit.md` containing these sections and the measured values from the generated matrix:

```markdown
# Block 4.3 — Current-state agentic audit

## Canonical state

- Base SHA: `6d9fd28bad4ae6f8cddcb4d0e11d3b36cd0d96ea`
- Store: `atal:store:v2`, version `2`
- Current orchestration: one-shot structured draft / command generation
- Current execution: deterministic Block 4.1 registry and transaction engine

## Measured parity

Copy the exact total, covered, partial, missing, excluded and parity percentage from `03-capability-parity-matrix.md`.

## What works today

List every fully covered capability group using exact tool names.

## What is only partial

List each partial row and the missing behavior that prevents full parity.

## What is missing

Group missing rows by read model, action tool, task persistence, multimodal artifact or client effect.

## Deliberate exclusions

List each excluded row and the product reason.

## Product conclusion

Classify current Atal IA as one of:

- documentation assistant with deterministic actions;
- partially agentic assistant;
- universal agentic assistant.

The current implementation must not be classified as universal until every non-excluded row is covered.
```

Replace the instruction sentences with the actual matrix-derived content before committing.

- [ ] **Step 5: Re-run audit generation and focused tests after corrections**

```bash
npm run audit:ai-capabilities
npm run test:core:compile
node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: PASS and stable matrix.

- [ ] **Step 6: Commit the verified audit**

```bash
git add src/features/atal-ai/core/audit docs/atal-ai/block-4-3/03-capability-parity-matrix.md docs/atal-ai/block-4-3/04-current-state-audit.md
git commit -m "docs: verify current Atal AI agentic readiness"
```

---

### Task 6: Derive the ordered implementation disposition

**Files:**
- Create: `docs/atal-ai/block-4-3/05-gap-disposition.md`
- Modify: `tests/atal-ai-capability-parity.test.mjs`

**Interfaces:**
- Consumes: verified audit rows.
- Produces: exact next-plan boundaries and dependency order.

- [ ] **Step 1: Add the failing disposition-completeness test**

Append:

```js
test('every non-covered capability has an implementation or exclusion disposition', () => {
  for (const row of audit.buildCapabilityAudit()) {
    if (row.coverage === 'covered') assert.equal(row.disposition, 'keep');
    else if (row.coverage === 'excluded') assert.equal(row.disposition, 'exclude');
    else assert.equal(row.disposition, 'build');
  }
});
```

- [ ] **Step 2: Run the focused tests**

```bash
npm run test:core:compile && node --test tests/atal-ai-capability-parity.test.mjs
```

Expected: PASS if every row has an explicit disposition.

- [ ] **Step 3: Write the gap disposition in dependency order**

Create `docs/atal-ai/block-4-3/05-gap-disposition.md` with these fixed plan boundaries:

```markdown
# Block 4.3 — Gap disposition and implementation order

## Plan 4.3B — Universal read model

Build minimum-context read tools for patients, contacts, complete records and versions, plans, exercises, sessions, reports, audit history, settings and delivery state.

Entry condition: verified capability matrix.
Exit condition: every read-only manual capability is covered or excluded.

## Plan 4.3C — Universal deterministic action registry

Build missing canonical action tools for contacts, patient lifecycle, notes, plan membership/order/duplication, exercise lifecycle/media, session recording/completion, report review, profile/theme preferences and approved delivery client effects.

Entry condition: 4.3B read model complete.
Exit condition: every approved manual mutation has one deterministic AI tool using canonical persistence, risk, audit and undo policy.

## Plan 4.3D — Bounded agentic orchestration and task memory

Replace the fixed one-shot intent router with bounded function calling, dynamic tool allowlists, resumable multi-step tasks, idempotency, duplicate-call detection, minimal clarification and truthful final summaries.

Entry condition: read and action registries complete.
Exit condition: representative single-step and multi-step text requests pass deterministically and with live Gemini.

## Plan 4.3E — Durable recorded-audio, image and PDF artifacts

Persist attachment identity and derived proposals, keep audio transcription linked to the conversation, use compact review for file-derived clinical facts and reuse canonical local media storage.

Entry condition: orchestration checkpoints persisted.
Exit condition: audio, image and PDF workflows survive reload and use the same agent policies as text.

## Plan 4.3F — Full product parity validation and MVP readiness

Execute every matrix row manually and through Atal IA; close reproducible gaps; run deterministic, live-model, Playwright, mobile, theme, persistence, interruption, audit and undo validation.

Entry condition: 4.3B–4.3E complete.
Exit condition: every non-excluded row covered and final readiness classification evidence-backed.
```

Under each plan, append the exact capability IDs classified as `partial` or `missing` that belong to that boundary. Do not move excluded capabilities into implementation work.

- [ ] **Step 4: Commit the disposition**

```bash
git add docs/atal-ai/block-4-3/05-gap-disposition.md tests/atal-ai-capability-parity.test.mjs
git commit -m "docs: order Atal AI agentic parity work"
```

---

### Task 7: Run complete baseline, publish evidence and hold the implementation gate

**Files:**
- Modify: PR description for the Block 4.3 draft PR.
- Comment: issue `#17`.
- No runtime source modification beyond the audit modules.

**Interfaces:**
- Consumes: complete audit artifacts and current repository baseline.
- Produces: validated checkpoint `4.3A COMPLETE` and exact inputs for Plan 4.3B.

- [ ] **Step 1: Run repository quality checks**

```bash
npm_config_cache=/tmp/atal-npm-cache npm ci
npm run typecheck
npm test
npm run build
npm run audit:ai-capabilities
git diff --check
git status --short
```

Expected:

- clean install succeeds;
- typecheck has 0 errors;
- all tests pass;
- production build succeeds;
- matrix regenerates without diff;
- `git diff --check` succeeds;
- working tree contains no uncommitted files after the final commit.

- [ ] **Step 2: Run deterministic E2E regression**

Use the repository's existing Playwright workflow or local command documented in `docs/testing/deterministic-playwright-e2e.md`.

Expected: all Block 4.1 and Block 4.2 critical tests PASS. The audit must not change the rendered product.

- [ ] **Step 3: Verify protected architecture**

```bash
git diff main...HEAD -- package-lock.json src/data/atalStore.ts src/features/atal-ai/core/executionEngine.ts src/features/atal-ai/contextual
```

Expected: no unintended product changes. `package-lock.json` and contextual workspace behavior remain unchanged; `atalStore.ts` is untouched.

- [ ] **Step 4: Update the draft PR description**

Report:

- exact base SHA;
- exact head SHA;
- generated totals and parity percentage;
- fully covered capability groups;
- highest-priority missing groups;
- deliberate exclusions;
- quality/test/build/E2E evidence;
- confirmation that runtime behavior was not modified;
- next plan: 4.3B universal read model;
- PR remains draft and unmerged.

- [ ] **Step 5: Add an issue #17 checkpoint comment**

Use this status format with exact measured values:

```markdown
## Checkpoint 4.3A — COMPLETE

- Capability matrix: generated and machine-validated
- Total manual capabilities: <exact total>
- Covered: <exact count>
- Partial: <exact count>
- Missing: <exact count>
- Excluded: <exact count>
- Full-parity percentage: <exact percentage>
- Runtime behavior changed: no
- Quality: PASS
- E2E: PASS
- Next checkpoint: 4.3B universal read model
```

Replace every angle-bracket value with the exact generated result before publishing.

- [ ] **Step 6: Stop at the implementation gate**

Do not begin Plan 4.3B until:

- the generated matrix and current-state audit are reviewed;
- any incorrect capability classification is corrected;
- the plan boundary remains aligned with the approved product design;
- the draft PR remains open and unmerged.

---

## Plan self-review

- Spec coverage: hybrid autonomy, minimal questioning, canonical persistence, risk, audit, undo, multimodal relevance, exclusions and cost boundaries are represented in the matrix fields and gap disposition.
- Scope: this plan performs only the 4.3A audit and does not implement the agent, keeping the first checkpoint independently reviewable.
- Type consistency: capability ids, coverage classes, confirmation values, audit values and disposition values are defined once and reused across inventory, mapping, tests and report generation.
- Placeholder scan: implementation steps contain exact file paths, commands, interfaces and code. Runtime-generated numeric results are explicitly required to replace report values before publication.
