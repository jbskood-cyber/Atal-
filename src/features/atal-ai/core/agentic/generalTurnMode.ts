export type GeneralTurnMode = 'agent' | 'draft';
export type AgentTurnKind = 'conversation' | 'read' | 'proposal' | 'action';
export type AgentToolKind = 'read' | 'action';

export type GeneralTurnModeInput = {
  text: string;
  hasDraft: boolean;
  draftModeArmed: boolean;
  hasImageOrPdf: boolean;
};

export type AgentTurnClassification = {
  kind: AgentTurnKind;
  allowedToolKinds: AgentToolKind[];
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

const deferredMutationPatterns = [
  /\bno (?:lo |la |los |las )?(?:guardes|apliques|cambies|modifiques|registres)\b/i,
  /\bsin (?:guardar|aplicar|cambiar|modificar|registrar)\b/i,
  /\b(?:todavía|todavia|aún|aun) no\b/i,
  /\bsolo (?:redacta|prepara|propón|propon|diseña|simula)\b/i,
  /\b(?:quiero|déjame|dejame) revis(?:ar|arlo|arla)\b/i,
];

const explicitActionPatterns = [
  /\b(?:añade|anade|agrega|guarda|registra|actualiza|modifica|cambia|crea|archiva|restaura|activa|pausa|completa|duplica|ordena|coloca|inicia|reanuda|termina|genera|descarga|imprime|exporta|elimina|borra|aplica)\b/i,
  /\b(?:guárdalo|guardalo|guárdala|guardala|hazlo|hazla|apl[ií]calo|apl[ií]cala)\b/i,
  /\bahora s[ií]\b.{0,24}\b(?:guarda|aplica|haz|registra|actualiza)\b/i,
];

const workspaceReadPatterns = [
  /\b(?:cuántos|cuantos|cuántas|cuantas|cuál|cual|cuáles|cuales|resume|resúmeme|muestra|dime|revisa|consulta|busca|encuentra)\b.{0,72}\b(?:paciente|pacientes|expediente|plan|planes|ejercicio|ejercicios|sesión|sesion|sesiones|reporte|reportes|actividad|ajustes|entrega)\b/i,
  /\b(?:último|ultima|última|anterior|actual|activo|activa|reciente|recientes)\b.{0,48}\b(?:plan|sesión|sesion|reporte|expediente|paciente)\b/i,
  /\b(?:de|del|para)\s+[A-ZÁÉÍÓÚÑ][\p{L}]+/u,
  /\b(?:este|esta|ese|esa|aquel|aquella|su)\s+(?:paciente|plan|sesión|sesion|expediente|reporte)\b/i,
  /\b(?:qué|que)\s+cambi(?:ó|o|a)\b.{0,48}\b(?:anterior|última|ultima|previa|previo)\b/i,
  /\b(?:respecto a|comparad[oa] con|frente a)\s+(?:la|el)\s+(?:anterior|últim[oa]|previ[oa])\b/i,
];

const conceptualPatterns = [
  /^\s*(?:qué|que|cómo|como|por qué|por que|para qué|para que|cuándo|cuando)\b/i,
  /\b(?:significa|definición|definicion|explica|explícame|explicame|cómo funciona|como funciona|para qué sirve|para que sirve|qué puede hacer|que puede hacer)\b/i,
];

/**
 * Safety classification for tool authorization only.
 * Gemini remains responsible for generating the response and deciding whether an allowed tool is useful.
 */
export function classifyAgentTurn(text: string): AgentTurnClassification {
  const value = text.trim();
  if (!value) return { kind: 'conversation', allowedToolKinds: [] };

  if (deferredMutationPatterns.some((pattern) => pattern.test(value))) {
    return { kind: 'proposal', allowedToolKinds: ['read'] };
  }

  if (explicitActionPatterns.some((pattern) => pattern.test(value))) {
    return { kind: 'action', allowedToolKinds: ['read', 'action'] };
  }

  const dependsOnWorkspace = workspaceReadPatterns.some((pattern) => pattern.test(value));
  if (dependsOnWorkspace) return { kind: 'read', allowedToolKinds: ['read'] };

  if (conceptualPatterns.some((pattern) => pattern.test(value))) {
    return { kind: 'conversation', allowedToolKinds: [] };
  }

  return { kind: 'conversation', allowedToolKinds: [] };
}

export function selectGeneralTurnMode(input: GeneralTurnModeInput): GeneralTurnMode {
  const text = input.text.trim();
  if (input.hasDraft || input.draftModeArmed) return 'draft';
  if (input.hasImageOrPdf && descriptiveFilePatterns.some((pattern) => pattern.test(text))) return 'agent';
  if (structuredDraftPatterns.some((pattern) => pattern.test(text))) return 'draft';
  return 'agent';
}
