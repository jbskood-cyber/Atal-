import { coreError, type ToolDefinition } from './contracts';

const STABLE_TOOL_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

function validateDefinition(definition: ToolDefinition): void {
  if (!STABLE_TOOL_NAME.test(definition.name)) {
    throw new TypeError(`Invalid tool name: ${definition.name}`);
  }
  if (definition.version !== 1) {
    throw new TypeError(`Unsupported tool version for ${definition.name}.`);
  }
  if (definition.risk === 'read' && definition.mutates) {
    throw new TypeError(`A read tool cannot mutate state: ${definition.name}.`);
  }
  if (definition.risk === 'read' && definition.supportsUndo) {
    throw new TypeError(`A read tool cannot support undo: ${definition.name}.`);
  }
  if (!definition.mutates && definition.supportsUndo) {
    throw new TypeError(`A non-mutating tool cannot support undo: ${definition.name}.`);
  }
  if (!definition.supportsUndo && definition.undoTtlMs !== undefined) {
    throw new TypeError(`Undo TTL requires undo support: ${definition.name}.`);
  }
  if (definition.undoTtlMs !== undefined && (!Number.isFinite(definition.undoTtlMs) || definition.undoTtlMs <= 0)) {
    throw new TypeError(`Undo TTL must be positive: ${definition.name}.`);
  }
}

export type ToolRegistry = {
  get(name: string): ToolDefinition;
  list(): ToolDefinition[];
};

export function createToolRegistry(definitions: ToolDefinition[]): ToolRegistry {
  const entries = new Map<string, ToolDefinition>();

  for (const definition of definitions) {
    validateDefinition(definition);
    if (entries.has(definition.name)) {
      throw new TypeError(`Duplicate tool registration: ${definition.name}.`);
    }
    entries.set(definition.name, definition);
  }

  const ordered = [...entries.values()].sort((left, right) => left.name.localeCompare(right.name));

  return Object.freeze({
    get(name: string) {
      const definition = entries.get(name);
      if (!definition) throw coreError('CORE_TOOL_UNKNOWN', 'La acción solicitada no está disponible.');
      return definition;
    },
    list() {
      return [...ordered];
    },
  });
}
