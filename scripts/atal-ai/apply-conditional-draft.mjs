import fs from 'node:fs';

const path = 'src/features/atal-ai/AtalAIGeneralScreen.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`No se encontró el ancla: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "import { selectGeneralTurnMode } from './core/agentic/generalTurnMode';",
  "import { classifyAgentTurn, selectGeneralTurnMode } from './core/agentic/generalTurnMode';",
  'turn classification import',
);

replaceOnce(
  "    const mode = selectGeneralTurnMode({\n      text: prompt,\n      hasDraft: Boolean(draft),\n      draftModeArmed,\n      hasImageOrPdf: attachments.some((item) => item.kind === 'image' || item.kind === 'pdf'),\n    });",
  "    const classification = classifyAgentTurn(prompt);\n    const mode = classification.kind === 'proposal' ? 'draft' : selectGeneralTurnMode({\n      text: prompt,\n      hasDraft: Boolean(draft),\n      draftModeArmed,\n      hasImageOrPdf: attachments.some((item) => item.kind === 'image' || item.kind === 'pdf'),\n    });",
  'proposal routing',
);

replaceOnce(
  "        append(createMessage('assistant', `Cambios aplicados. ${coreResult.summary.join(' ')}`));\n        setLegacyConfirmation(null);",
  "        append(createMessage('assistant', `Cambios aplicados. ${coreResult.summary.join(' ')}`));\n        setDraft(null);\n        setLegacyConfirmation(null);",
  'clear applied draft',
);

fs.writeFileSync(path, source);
console.log(`Actualizado ${path}`);
