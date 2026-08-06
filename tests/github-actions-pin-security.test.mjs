import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const deterministicWorkflows = [
  '.github/workflows/quality.yml',
  '.github/workflows/behavior-system-quality.yml',
  '.github/workflows/e2e.yml',
];

const immutableActionRef = /^[^\s#]+@[0-9a-f]{40}(?:\s+#.*)?$/i;

test('deterministic CI actions use immutable commit SHAs', async () => {
  for (const workflowPath of deterministicWorkflows) {
    const workflow = await readFile(workflowPath, 'utf8');
    const actionRefs = [...workflow.matchAll(/^\s*-?\s*uses:\s*(.+)$/gm)].map((match) => match[1].trim());

    assert.ok(actionRefs.length > 0, `${workflowPath} must contain at least one action`);

    for (const actionRef of actionRefs) {
      assert.match(
        actionRef,
        immutableActionRef,
        `${workflowPath} contains a mutable action reference: ${actionRef}`,
      );
    }
  }
});
