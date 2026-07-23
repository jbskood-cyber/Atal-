import { readFileSync, writeFileSync } from 'node:fs';

function update(path, replacements) {
  let content = readFileSync(path, 'utf8');
  for (const [before, after] of replacements) {
    if (!content.includes(before)) throw new Error(`Expected block not found in ${path}: ${before.slice(0, 80)}`);
    content = content.replace(before, after);
  }
  writeFileSync(path, content, 'utf8');
}

update('src/features/atal-ai/core/contracts.ts', [
  [
`export type ToolInvocation<TInput = unknown> = {
  tool: string;
  version: 1;
  input: TInput;
  references: EntityRef[];
  proposalId: string;
};`,
`export type ToolInvocation<TInput = unknown> = {
  tool: string;
  version: 1;
  input: TInput;
  references: EntityRef[];
  proposalId: string;
  authorization?: 'explicit-user-request' | 'file-derived';
};`,
  ],
  [
`      collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'settings';`,
`      collection: 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'notes' | 'sessions' | 'settings';`,
  ],
  [
`        | 'clinicalRecordVersions'
        | 'notes'
        | 'events'`,
`        | 'clinicalRecordVersions'
        | 'notes'
        | 'sessions'
        | 'events'`,
  ],
  [
`export type ClientEffect =
  | { type: 'download'; filename: string; mimeType: string; content: string };`,
`export type ClientEffect =
  | { type: 'download'; filename: string; mimeType: string; content: string }
  | { type: 'navigate'; href: string }
  | { type: 'theme'; mode: 'light' | 'dark' | 'system' }
  | { type: 'session-draft'; operation: 'start' | 'update' | 'complete'; patientId: string; planId: string; draft: Record<string, unknown> }
  | { type: 'delivery'; action: 'open' | 'download' | 'share' | 'print'; planId: string; options?: Record<string, unknown> };`,
  ],
]);

update('src/features/atal-ai/core/transactionEngine.ts', [
  [
`type ArrayCollection = 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'clinicalRecordVersions' | 'notes';`,
`type ArrayCollection = 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'clinicalRecordVersions' | 'notes' | 'sessions';`,
  ],
  [
`const collections: ArrayCollection[] = ['patients', 'plans', 'exercises', 'clinicalRecords', 'clinicalRecordVersions', 'notes'];`,
`const collections: ArrayCollection[] = ['patients', 'plans', 'exercises', 'clinicalRecords', 'clinicalRecordVersions', 'notes', 'sessions'];`,
  ],
  [
`        if (!['patients', 'plans', 'exercises', 'clinicalRecords'].includes(collection)) {`,
`        if (!['patients', 'plans', 'exercises', 'clinicalRecords', 'notes', 'sessions'].includes(collection)) {`,
  ],
  [
`          collection: collection as 'patients' | 'plans' | 'exercises' | 'clinicalRecords',`,
`          collection: collection as 'patients' | 'plans' | 'exercises' | 'clinicalRecords' | 'notes' | 'sessions',`,
  ],
]);

update('src/features/atal-ai/core/undoEngine.ts', [
  [
`  notes: 1,
  plans: 2,`,
`  notes: 1,
  sessions: 2,
  plans: 3,`,
  ],
  [
`  clinicalRecords: 3,
  exercises: 4,
  patients: 5,`,
`  clinicalRecords: 4,
  exercises: 5,
  patients: 6,`,
  ],
  [
`  exercises: 2,
  plans: 3,
  clinicalRecords: 4,
  patients: 5,`,
`  notes: 2,
  sessions: 2,
  exercises: 3,
  plans: 4,
  clinicalRecords: 5,
  patients: 6,`,
  ],
]);

update('src/features/atal-ai/core/riskPolicy.ts', [
  [
`  const required = REQUIRED_MODE[definition.risk];

  if (required === 'none') {`,
`  const required = REQUIRED_MODE[definition.risk];

  if (definition.risk === 'reversible-write' && invocation.authorization === 'explicit-user-request') {
    return { mode: 'none', fingerprint, reason: 'La instrucción explícita autoriza esta acción reversible.' };
  }
  if (definition.risk === 'reversible-write' && invocation.authorization === 'file-derived') {
    return { mode: 'review', fingerprint, reason: 'Los datos clínicos extraídos de un archivo requieren una revisión compacta.' };
  }

  if (required === 'none') {`,
  ],
]);

console.log('Applied Block 4.3 core codemod.');
