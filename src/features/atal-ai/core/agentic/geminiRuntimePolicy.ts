export const AGENT_MAX_OUTPUT_TOKENS = 8_192;

export type GeminiTurnDiagnostics = {
  finishReason?: string;
  thoughtsTokenCount?: number;
  candidatesTokenCount?: number;
};

function normalizedModel(model: string): string {
  return model.trim().toLowerCase();
}

export function agentGenerationConfigForModel(model: string): {
  maxOutputTokens: number;
  thinkingConfig?: { thinkingLevel: 'minimal' | 'low' } | { thinkingBudget: number };
} {
  const normalized = normalizedModel(model);

  if (normalized.startsWith('gemini-3')) {
    return {
      maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
      thinkingConfig: {
        thinkingLevel: normalized.includes('flash-lite') ? 'minimal' : 'low',
      },
    };
  }

  if (normalized.startsWith('gemini-2.5')) {
    return {
      maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
      thinkingConfig: {
        thinkingBudget: normalized.includes('flash-lite') ? 0 : 1_024,
      },
    };
  }

  return { maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS };
}

function safeDiagnosticValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return 'unknown';
  return value.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80) || 'unknown';
}

export function emptyModelTurnError(model: string, diagnostics: GeminiTurnDiagnostics = {}): Error {
  return new Error([
    'MODEL_EMPTY_RESPONSE',
    `model=${safeDiagnosticValue(model)}`,
    `finishReason=${safeDiagnosticValue(diagnostics.finishReason)}`,
    `thoughtsTokenCount=${safeDiagnosticValue(diagnostics.thoughtsTokenCount)}`,
    `candidatesTokenCount=${safeDiagnosticValue(diagnostics.candidatesTokenCount)}`,
  ].join(' '));
}
