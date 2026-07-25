export type SessionPatchKey =
  | 'endPain'
  | 'endEnergy'
  | 'effort'
  | 'symptoms'
  | 'endComment'
  | 'easiest'
  | 'hardest'
  | 'discomfort';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const FINAL_PATCH_PATTERNS: Array<[SessionPatchKey, RegExp]> = [
  ['endPain', /\bdolor\s+(?:final|al\s+final)\b/],
  ['endEnergy', /\benergia\s+(?:final|al\s+final)\b/],
  ['effort', /\besfuerzo\b/],
  ['symptoms', /\bsintomas?\b/],
  ['endComment', /\bcomentario\s+(?:final|de\s+cierre)\b|\bcomentario\b/],
  ['easiest', /\b(?:mas\s+facil|lo\s+mas\s+facil)\b/],
  ['hardest', /\b(?:mas\s+dificil|lo\s+mas\s+dificil)\b/],
  ['discomfort', /\b(?:molestia|incomodidad)\b/],
];

export function selectSessionPatchKeys(text: string): SessionPatchKey[] {
  const normalized = normalize(text);
  return FINAL_PATCH_PATTERNS
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([key]) => key);
}
