import fs from 'node:fs';

for (const path of [
  'src/features/atal-ai/AtalAIGeneralScreen.tsx',
  'src/features/atal-ai/contextual/useContextualConversation.ts',
]) {
  let source = fs.readFileSync(path, 'utf8');
  const before = 'if (mutationResult && draft) setDraft(null);';
  const after = "if (mutationResult && draft && outcome.task.status === 'completed') setDraft(null);";
  if (!source.includes(before)) throw new Error(`${path}: no se encontró la regla de ciclo de vida`);
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
}

console.log('Draft lifecycle keeps pending confirmation state reviewable.');
