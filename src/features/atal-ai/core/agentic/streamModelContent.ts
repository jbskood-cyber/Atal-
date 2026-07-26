import type { AgentHistoryContent } from './contracts';

type ProviderPart = Record<string, unknown>;
type ProviderContent = { role?: string; parts?: ProviderPart[] } | undefined;

function functionCallKey(part: ProviderPart): string {
  const call = part.functionCall;
  if (!call || typeof call !== 'object' || Array.isArray(call)) return '';
  const record = call as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!id && !name) return '';
  return `${id}\u0000${name}`;
}

export function createStreamModelContentCollector() {
  const parts: ProviderPart[] = [];
  const functionPartIndexes = new Map<string, number>();

  const addContent = (content: ProviderContent) => {
    if (!content?.parts?.length) return;
    for (const rawPart of content.parts) {
      const part = structuredClone(rawPart);
      const key = functionCallKey(part);
      if (!key) {
        parts.push(part);
        continue;
      }

      const existingIndex = functionPartIndexes.get(key);
      if (existingIndex === undefined) {
        functionPartIndexes.set(key, parts.length);
        parts.push(part);
        continue;
      }

      const existing = parts[existingIndex] ?? {};
      const existingSignature = typeof existing.thoughtSignature === 'string' ? existing.thoughtSignature : '';
      const nextSignature = typeof part.thoughtSignature === 'string' ? part.thoughtSignature : '';
      if (nextSignature || !existingSignature) parts[existingIndex] = { ...existing, ...part };
    }
  };

  const content = (): AgentHistoryContent | undefined => parts.length ? { role: 'model', parts: structuredClone(parts) } : undefined;

  return { addContent, content };
}
