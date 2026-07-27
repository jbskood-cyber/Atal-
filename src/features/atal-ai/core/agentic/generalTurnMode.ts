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
  /\b(?:prepara|preparar|redacta|redactar|propón|propon)\b.{0,48}\b(?:nota|seguimiento|informe)\b/i,
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
  /\b(?:lo|la|los|las)\s+revisar/i,
];

// A negative clause can be a scope guard for a positive action instead of a
// request to defer the action itself. Keep this intentionally narrow: the
// user must have an explicit positive action and the negative clause must
// clearly protect "another" target (or "nothing else").
const scopedNegativeConstraintPatterns = [
  /\bno\s+(?:lo\s+|la\s+|los\s+|las\s+)?(?:cambies|modifiques|edites|actualices)\b.{0,64}\bni\s+otr[oa]s?\b/i,
  /\bno\s+(?:lo\s+|la\s+|los\s+|las\s+)?(?:cambies|modifiques|edites|actualices)\b.{0,48}\bnada\s+m[aá]s\b/i,
];

const draftCommitPatterns = [
  /\b(?:guárdalo|guardalo|guárdala|guardala|hazlo|hazla|apl[ií]calo|apl[ií]cala)\b/i,
  /\bahora s[ií]\b.{0,24}\b(?:guarda|aplica|haz|registra)\b/i,
];

const explicitActionPatterns = [
  /\b(?:da|dar|marca|marcar)\b.{0,24}\b(?:por\s+)?(?:terminado|terminada|completado|completada|finalizado|finalizada)\b/i,
  /\b(?:añade|anade|añádele|anadele|agrega|agrégale|agregale|guarda|registra|actualiza|actualízale|actualizale|modifica|modifícale|modificale|cambia|cámbiale|cambiale|ajusta|ajústale|ajustale|corrige|corrígele|corrigele|edita|edítale|editale|quita|quítale|quitale|sustituye|sustituir|reemplaza|reemplazar|crea|archiva|restaura|activa|pausa|completa|duplica|ordena|coloca|inicia|reanuda|termina|genera|descarga|imprime|exporta|elimina|borra|aplica)\b/i,
  ...draftCommitPatterns,
];

const draftEditPatterns = [
  /\b(?:cambia|cámbiale|cambiale|modifica|modifícale|modificale|ajusta|ajústale|ajustale|corrige|corrígele|corrigele|edita|edítale|editale|añade|anade|añádele|anadele|agrega|agrégale|agregale|quita|quítale|quitale|sustituye|sustituir|reemplaza|reemplazar|elimina|reordena)\b.{0,80}\b(?:borrador|paciente|expediente|plan|tratamiento|ejercicio|frecuencia|duración|duracion|objetivo|enfoque|progresión|progresion|indicaciones|series|repeticiones|tiempo|descanso|precauciones)\b/i,
  /\b(?:en el|del|al)\s+borrador\b/i,
];

const workspaceReadPatterns = [
  /(?:^|[^\p{L}\p{N}_])(?:qué|que)\s+(?:pacientes|planes|ejercicios|sesiones|reportes|expedientes)\b.{0,72}\b(?:tengo|tienes|tenemos|hay|existen|registrad[oa]s?|guardad[oa]s?|activ[oa]s?|recientes?)\b/iu,
  /\b(?:cuántos|cuantos|cuántas|cuantas|cuál|cual|cuáles|cuales|resume|resúmeme|muestra|dime|revisa|consulta|busca|encuentra|abre|abrir|navega)\b.{0,72}\b(?:paciente|pacientes|expediente|plan|planes|ejercicio|ejercicios|sesión|sesion|sesiones|reporte|reportes|actividad|ajustes|entrega)\b/i,
  /\b(?:último|ultima|última|anterior|actual|activo|activa|reciente|recientes)\b.{0,48}\b(?:plan|sesión|sesion|reporte|expediente|paciente)\b/i,
  /\b(?:de|del|para)\s+[A-ZÁÉÍÓÚÑ][\p{L}]+/u,
  /\b(?:este|esta|ese|esa|aquel|aquella|su)\s+(?:paciente|plan|sesión|sesion|expediente|reporte)\b/i,
  /(?:^|[^\p{L}\p{N}_])(?:qué|que)\s+cambi(?:ó|o|a)\b.{0,48}\b(?:anterior|última|ultima|previa|previo)\b/iu,
  /\b(?:respecto a|comparad[oa] con|frente a)\s+(?:la|el)\s+(?:anterior|últim[oa]|previ[oa])\b/i,
];

const conceptualPatterns = [
  /^(?:qué|que|cómo|como|por qué|por que|para qué|para que|cuándo|cuando)(?=\s|[?¡!,:;.]|$)/i,
  /\b(?:significa|definición|definicion|explica|explícame|explicame|cómo funciona|como funciona|para qué sirve|para que sirve|qué puede hacer|que puede hacer)\b/i,
];

function classificationText(text: string): string {
  // Spanish users naturally start questions with ¿/¡. JavaScript \b is ASCII
  // oriented and is unreliable at boundaries that end in accented letters
  // such as “qué”. Strip only leading inverted punctuation; preserve the rest
  // of the original text for intent semantics.
  return text.trim().replace(/^[¿¡]+\s*/, '');
}

/**
 * Safety classification used only to authorize tool categories.
 * Gemini remains responsible for generating the response and choosing among
 * the tools that Atal makes available for the current turn.
 */
export function classifyAgentTurn(text: string): AgentTurnClassification {
  const value = classificationText(text);
  if (!value) return { kind: 'conversation', allowedToolKinds: [] };

  const hasExplicitAction = explicitActionPatterns.some((pattern) => pattern.test(value));
  const hasDeferredMutation = deferredMutationPatterns.some((pattern) => pattern.test(value));
  const hasScopedNegativeConstraint = hasExplicitAction
    && scopedNegativeConstraintPatterns.some((pattern) => pattern.test(value));

  if (hasDeferredMutation && !hasScopedNegativeConstraint) {
    return { kind: 'proposal', allowedToolKinds: ['read'] };
  }

  if (hasExplicitAction) {
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
  if (input.hasDraft && draftCommitPatterns.some((pattern) => pattern.test(text))) return 'agent';
  if (input.hasImageOrPdf && descriptiveFilePatterns.some((pattern) => pattern.test(text))) return 'agent';
  if (input.draftModeArmed) return 'draft';
  if (input.hasDraft) {
    if (deferredMutationPatterns.some((pattern) => pattern.test(text))) return 'draft';
    if (structuredDraftPatterns.some((pattern) => pattern.test(text))) return 'draft';
    if (draftEditPatterns.some((pattern) => pattern.test(text))) return 'draft';
    return 'agent';
  }
  if (deferredMutationPatterns.some((pattern) => pattern.test(text)) && structuredDraftPatterns.some((pattern) => pattern.test(text))) return 'draft';
  if (structuredDraftPatterns.some((pattern) => pattern.test(text))) return 'draft';
  return 'agent';
}
