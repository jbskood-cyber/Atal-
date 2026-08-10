import type { ToolSelectionInput } from './toolSelection';

const READ_ONLY_TOOLS = new Set(['app.read', 'patient.search']);

function requiresLatestCompletedSessionRead(input: ToolSelectionInput, allowedTools: string[]): boolean {
  if (!allowedTools.includes('app.read')) return false;
  const normalized = input.text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
  return /\b(?:ultima|ultimo|mas reciente|reciente)\b.{0,48}\bsesion\b.{0,48}\bcompletad[ao]\b/.test(normalized)
    || /\bsesion\b.{0,48}\b(?:ultima|ultimo|mas reciente|reciente)\b.{0,48}\bcompletad[ao]\b/.test(normalized);
}

export function requiredAgentToolsForSelection(input: ToolSelectionInput, allowedTools: string[]): string[] {
  const explicitMutations = [...new Set(allowedTools.filter((tool) => !READ_ONLY_TOOLS.has(tool)))];
  if (explicitMutations.length === 0 && requiresLatestCompletedSessionRead(input, allowedTools)) return ['app.read'];
  if (explicitMutations.length === 1 && explicitMutations[0] === 'plan.membership') return explicitMutations;
  if (input.intent !== 'update_existing_plan') return [];
  if (explicitMutations.length > 1) return explicitMutations;
  return [];
}
