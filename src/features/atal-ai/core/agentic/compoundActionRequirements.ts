import type { ToolSelectionInput } from './toolSelection';

const READ_ONLY_TOOLS = new Set(['app.read', 'patient.search']);

export function requiredAgentToolsForSelection(input: ToolSelectionInput, allowedTools: string[]): string[] {
  if (input.intent !== 'update_existing_plan') return [];
  const explicitMutations = allowedTools.filter((tool) => !READ_ONLY_TOOLS.has(tool));
  return explicitMutations.length > 1 ? [...new Set(explicitMutations)] : [];
}
