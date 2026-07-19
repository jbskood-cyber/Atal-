export type NumericCommitOptions = { fallback: number; min?: number; max?: number };

export function commitNumericDraft(value: string, { fallback, min, max }: NumericCommitOptions) {
  const normalized = value.trim().replace(',', '.');
  const parsed = normalized === '' ? fallback : Number(normalized);
  let result = Number.isFinite(parsed) ? parsed : fallback;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}
