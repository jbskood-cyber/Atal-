import fs from 'node:fs';

function patch(path, patches) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [search, replacement, label] of patches) {
    if (!source.includes(search)) throw new Error(`${path}: no se encontró ${label}`);
    source = source.replace(search, replacement);
  }
  fs.writeFileSync(path, source);
}

patch('src/features/atal-ai/AtalAIGeneralScreen.tsx', [
  [
    "        task: conversation.agentTask,\n        signal: controller.signal,",
    "        task: conversation.agentTask,\n        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,\n        signal: controller.signal,",
    'draft context in general request',
  ],
  [
    "        task,\n        onTextDelta: (delta) => setStreamingText((current) => current + delta),",
    "        task,\n        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,\n        onTextDelta: (delta) => setStreamingText((current) => current + delta),",
    'draft context in general confirmation',
  ],
]);

patch('src/features/atal-ai/contextual/useContextualConversation.ts', [
  [
    "        task: conversation.agentTask,\n        assistantScope: 'contextual',",
    "        task: conversation.agentTask,\n        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,\n        assistantScope: 'contextual',",
    'draft context in contextual request',
  ],
  [
    "    const useDraft = Boolean(draft)\n      || classification.kind === 'proposal'\n      || selectGeneralTurnMode({ text, hasDraft: Boolean(draft), draftModeArmed: false, hasImageOrPdf: false }) === 'draft';",
    "    const useDraft = classification.kind === 'proposal'\n      || selectGeneralTurnMode({ text, hasDraft: Boolean(draft), draftModeArmed: false, hasImageOrPdf: false }) === 'draft';",
    'contextual draft mode decision',
  ],
  [
    "        task,\n        assistantScope: 'contextual',",
    "        task,\n        draftContext: draft ? { draft, privateContact: conversation.privateContact } : undefined,\n        assistantScope: 'contextual',",
    'draft context in contextual confirmation',
  ],
]);

console.log('Atal draft context connected to global and contextual agent turns.');
