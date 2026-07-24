import fs from 'node:fs';

function patch(path, patches) {
  let source = fs.readFileSync(path, 'utf8');
  for (const [search, replacement, label] of patches) {
    if (!source.includes(search)) throw new Error(`${path}: no se encontró ${label}`);
    source = source.replace(search, replacement);
  }
  fs.writeFileSync(path, source);
}

patch('src/features/atal-ai/AtalAIGeneralScreen.tsx', [[
  "    });\n    setAttachments([]);\n    if (outcome.task.status === 'needs-confirmation') {",
  "    });\n    if (mutationResult && draft) setDraft(null);\n    setAttachments([]);\n    if (outcome.task.status === 'needs-confirmation') {",
  'clear global draft after agent mutation',
]]);

patch('src/features/atal-ai/contextual/useContextualConversation.ts', [
  [
    "      append(createMessage('assistant', `Cambios aplicados. ${result.summary.join(' ')}`));\n      setPendingConfirmation(null);",
    "      append(createMessage('assistant', `Cambios aplicados. ${result.summary.join(' ')}`));\n      setDraft(null);\n      setPendingConfirmation(null);",
    'clear contextual draft after legacy apply',
  ],
  [
    "    } : current);\n    if (outcome.task.status === 'needs-confirmation') {",
    "    } : current);\n    if (mutationResult && draft) setDraft(null);\n    if (outcome.task.status === 'needs-confirmation') {",
    'clear contextual draft after agent mutation',
  ],
]);

console.log('Applied Atal draft lifecycle rules.');
