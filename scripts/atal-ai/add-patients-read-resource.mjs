import fs from 'node:fs';

function patch(path, patches) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [search, replacement, label] of patches) {
    if (!source.includes(search)) throw new Error(`${path}: no se encontró ${label}`);
    source = source.replace(search, replacement);
  }
  fs.writeFileSync(path, source);
}

patch('src/features/atal-ai/core/tools/universalReadTools.ts', [
  ["export type AppReadResource =\n  | 'patient_profile'", "export type AppReadResource =\n  | 'patients'\n  | 'patient_profile'", 'patients resource type'],
  ["const resources = new Set<AppReadResource>([\n  'patient_profile',", "const resources = new Set<AppReadResource>([\n  'patients',\n  'patient_profile',", 'patients resource registry'],
  [
    "      if (resource === 'patient_profile') {",
    `      if (resource === 'patients') {
        const matching = newestFirst(environment.state.patients.filter((item) =>
          (!status || item.status === status)
          && (!normalizedQuery || normalizeEntityLabel(\`${'${item.name} ${item.diagnosis} ${item.affectedArea}'}\`).includes(normalizedQuery)),
        ));
        const patients = matching.slice(0, limit);
        return {
          status: 'success',
          message: \`Encontré ${'${matching.length}'} pacientes.\`,
          summary: [\`${'${matching.length}'} pacientes coinciden.\`, ...patients.map((item) => \`${'${item.name}'} · ${'${item.status}'}\`)],
          data: { patients, total: matching.length },
          href: '/patients',
          affected: [],
        };
      }

      if (resource === 'patient_profile') {`,
    'patients read execution',
  ],
]);

patch('src/features/atal-ai/api/agentToolCatalog.ts', [[
  "export const APP_READ_RESOURCES = [\n  'patient_profile',",
  "export const APP_READ_RESOURCES = [\n  'patients', 'patient_profile',",
  'patients tool schema enum',
]]);

patch('tests/atal-ai-tool-contracts.test.mjs', [[
  "  assert.deepEqual(entry.inputSchema.properties.resource.enum, [\n    'patient_profile',",
  "  assert.deepEqual(entry.inputSchema.properties.resource.enum, [\n    'patients',\n    'patient_profile',",
  'patients contract expectation',
]]);

patch('tests/atal-ai-live-smoke.mjs', [[
  "enum: ['patient_profile',",
  "enum: ['patients', 'patient_profile',",
  'patients live schema enum',
]]);

console.log('Added canonical patients read resource.');
