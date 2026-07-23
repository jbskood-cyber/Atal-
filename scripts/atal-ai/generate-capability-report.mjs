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
  'Generated from branch `feature/atal-ai-agentic-audit-block-4-3`.',
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
