export type GeneralTurnMode = 'agent' | 'draft';

export type GeneralTurnModeInput = {
  text: string;
  hasDraft: boolean;
  draftModeArmed: boolean;
  hasImageOrPdf: boolean;
};

const structuredDraftPatterns = [
  /\bborrador\b/i,
  /\b(?:crea|crear|diseña|diseñar|prepara|preparar|arma|armar)\b.{0,48}\b(?:plan|programa|tratamiento)\b/i,
  /\b(?:nuevo|nueva|crear|crea|diseña|prepara)\b.{0,32}\b(?:paciente|ejercicio)\b/i,
  /\bplan de tratamiento\b/i,
  /\bprograma de ejercicios\b/i,
  /\bextrae\b.{0,48}\b(?:expediente|plan|ejercicio|indicaciones|datos clínicos|datos clinicos)\b/i,
];

const descriptiveFilePatterns = [
  /\bqué (?:es|aparece|ves|muestra)\b/i,
  /\bdescribe\b/i,
  /\bexplica\b/i,
  /\bno (?:realices|hagas|apliques|guardes|modifiques)\b/i,
];

export function selectGeneralTurnMode(input: GeneralTurnModeInput): GeneralTurnMode {
  const text = input.text.trim();
  if (input.hasDraft || input.draftModeArmed) return 'draft';
  if (input.hasImageOrPdf && descriptiveFilePatterns.some((pattern) => pattern.test(text))) return 'agent';
  if (structuredDraftPatterns.some((pattern) => pattern.test(text))) return 'draft';
  return 'agent';
}
