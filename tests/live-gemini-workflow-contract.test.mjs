import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowPath = new URL('../.github/workflows/live-gemini-smoke.yml', import.meta.url);

const readWorkflow = () => readFile(workflowPath, 'utf8');

test('full live Gemini matrix uses the verified model cascade instead of a synthetic model token', async () => {
  const workflow = await readWorkflow();

  assert.doesNotMatch(
    workflow,
    /GEMINI_MODEL:\s*['"]AQ\.synthetic-ai-studio-platform-resource-token['"]/,
    'the browser matrix must not force the synthetic AI Studio resource token as a Gemini model',
  );
  assert.match(
    workflow,
    /GEMINI_MODEL:\s*''[\s\S]*GEMINI_MODEL_CASCADE:\s*'gemini-3\.6-flash,gemini-3\.5-flash-lite,gemini-3\.1-flash-lite'/,
    'the browser matrix must use the same provider-verified model cascade as preflight',
  );
});
