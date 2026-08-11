export const DEFAULT_GEMINI_MODEL_CASCADE = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
] as const;

const DEFAULT_FALLBACK_DELAY_MS = 250;
const GEMINI_MODEL_NAME_PATTERN = /^gemini-[a-z0-9][a-z0-9._-]*$/i;
const AUTH_FAILURE_PATTERN = /\b(?:401|403)\b|API key not valid|invalid API key|UNAUTHENTICATED|permission denied|PERMISSION_DENIED|schema|function call|INVALID_ARGUMENT|invalid argument/i;
const TRANSIENT_FAILURE_PATTERN = /MODEL_EMPTY_RESPONSE|\b429\b|RESOURCE_EXHAUSTED|quota|rate limit|too many requests|\b503\b|UNAVAILABLE|overload|temporar(?:y|ily)|timed? out|timeout|ECONNRESET|ECONNREFUSED|EAI_AGAIN|fetch failed|network error/i;

function normalizeConfiguredGeminiModel(model: string): string | null {
  const normalized = model.trim().replace(/^models\//i, '');
  return GEMINI_MODEL_NAME_PATTERN.test(normalized) ? normalized : null;
}

export function resolveGeminiModelCascade(configured?: string | null): string[] {
  const requested = configured
    ?.split(',')
    .map((model) => normalizeConfiguredGeminiModel(model))
    .filter((model): model is string => Boolean(model)) ?? [];
  const source = requested.length ? requested : [...DEFAULT_GEMINI_MODEL_CASCADE];
  return [...new Set(source)];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return String(error ?? '');
}

export function isTransientGeminiFailure(error: unknown): boolean {
  const message = errorMessage(error);
  // A syntactically valid model can be retired or unavailable for the current
  // project even when it remains in an older configured cascade. No action has
  // executed at this point, so continuing to the next declared model is safe.
  if (/\b404\b|NOT_FOUND/i.test(message) && /model/i.test(message) && /no longer available|not available|not found|unsupported|not supported/i.test(message)) {
    return true;
  }
  // Some Gemini variants can emit a function name that was never declared even
  // under restricted function-calling mode. No action has executed at this
  // point, so the safe recovery is to reject that output and retry the next
  // configured model rather than accepting/aliasing an undeclared capability.
  if (/Gemini solicitó una herramienta no permitida:/i.test(message)) return true;
  // Quota responses can mention the phrase "API key" while still being a 429.
  // Only explicit authentication/permission failures are permanent; a mere
  // mention of an API key must not abort the model cascade.
  if (AUTH_FAILURE_PATTERN.test(message)) return false;
  return TRANSIENT_FAILURE_PATTERN.test(message);
}

function terminalTransientError(): Error {
  // Do not leak provider wording such as "per API key" into presentation
  // classification: server/UI layers can now reliably render this as temporary
  // saturation rather than falsely claiming the project has no key configured.
  return new Error('503 UNAVAILABLE GEMINI_TRANSIENT_PROVIDER_FAILURE');
}

type GeminiFallbackOptions<T> = {
  models: readonly string[];
  operation: (model: string) => Promise<T>;
  sleep?: (milliseconds: number) => Promise<void>;
  onFallback?: (details: { failedModel: string; nextModel: string; attempt: number; error: unknown }) => void;
};

const defaultSleep = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

export async function runWithGeminiFallback<T>({
  models,
  operation,
  sleep = defaultSleep,
  onFallback,
}: GeminiFallbackOptions<T>): Promise<T> {
  const cascade = [...new Set(models.map((model) => model.trim()).filter(Boolean))];
  if (!cascade.length) throw new Error('No hay modelos Gemini configurados.');

  let lastError: unknown;
  for (let index = 0; index < cascade.length; index += 1) {
    const model = cascade[index];
    try {
      return await operation(model);
    } catch (error) {
      lastError = error;
      const transient = isTransientGeminiFailure(error);
      const nextModel = cascade[index + 1];
      if (!transient) throw error;
      if (!nextModel) throw terminalTransientError();
      onFallback?.({ failedModel: model, nextModel, attempt: index + 1, error });
      await sleep(DEFAULT_FALLBACK_DELAY_MS * (2 ** index));
    }
  }
  if (lastError && isTransientGeminiFailure(lastError)) throw terminalTransientError();
  throw lastError instanceof Error ? lastError : new Error('Gemini no pudo completar la solicitud.');
}
