import type { ToolSelectionInput } from './toolSelection';

const READ_ONLY_TOOLS = new Set(['app.read', 'patient.search']);

export function requiredAgentToolsForSelection(input: ToolSelectionInput, allowedTools: string[]): string[] {
  const explicitMutations = [...new Set(allowedTools.filter((tool) => !READ_ONLY_TOOLS.has(tool)))];
  if (explicitMutations.length === 1 && explicitMutations[0] === 'plan.membership') return explicitMutations;
  if (input.intent !== 'update_existing_plan') return [];
  if (explicitMutations.length > 1) return explicitMutations;
  return [];
}
