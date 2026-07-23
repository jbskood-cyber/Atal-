import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/features/atal-ai/types.ts';
let content = readFileSync(path, 'utf8');
if (!content.includes('agentTask?: AgentTaskState;')) {
  content = content.replace("  contextEntityLabel?: string;\n", "  contextEntityLabel?: string;\n  agentTask?: AgentTaskState;\n");
}
if (!content.includes("import type { AgentTaskState } from './core/agentic/contracts';")) {
  content += "\nimport type { AgentTaskState } from './core/agentic/contracts';\n";
}
writeFileSync(path, content, 'utf8');
console.log('Added durable agent task to AIConversation.');
