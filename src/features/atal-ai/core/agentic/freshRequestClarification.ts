const GENERIC_PLAN_MUTATION_PATTERN = /\b(?:actualiza|actualizar|modifica|modificar|cambia|cambiar|ajusta|ajustar|edita|editar)\b.{0,64}\b(?:tratamiento|plan)\b|\b(?:tratamiento|plan)\b.{0,64}\b(?:actualiza|actualizar|modifica|modificar|cambia|cambiar|ajusta|ajustar|edita|editar)\b/i;
const EXPLICIT_PLAN_FIELD_PATTERN = /\b(?:frecuencia|t[ií]tulo|nombre del plan|objetivo|enfoque|duraci[oó]n|progresi[oó]n|criterio|instrucciones)\b/i;
const EXPLICIT_EXERCISE_ACTION_PATTERN = /\b(?:añade|anade|agrega|agregar|quita|quitar|elimina|eliminar|reordena|reordenar|ordena|ordenar|crea|crear|duplica|duplicar)\b.{0,40}\bejercicios?\b/i;
const EXPLICIT_PLAN_LIFECYCLE_PATTERN = /\b(?:activa|activar|pausa|pausar|suspende|suspender|completa|completar|finaliza|finalizar|termina|terminar|archiva|archivar|restaura|restaurar|reactiva|reactivar|reemplaza|reemplazar|sustituye|sustituir|duplica|duplicar|crea|crear|nuevo plan|plan nuevo)\b/i;
const CONTEXTLESS_CONFIRMATION_PATTERN = /^(?:s[ií][,.!¡¿? ]*|hazlo(?:\s+ahora)?[.!¡¿? ]*|adelante[.!¡¿? ]*|dale[.!¡¿? ]*|confirmo[.!¡¿? ]*|contin[uú]a(?:\s+con\s+(?:eso|ello))?[.!¡¿? ]*|gu[aá]rdalo[.!¡¿? ]*|apl[ií]calo[.!¡¿? ]*)$/i;

function isFreshUnderspecifiedPlanMutation(text: string): boolean {
  if (!GENERIC_PLAN_MUTATION_PATTERN.test(text)) return false;
  if (EXPLICIT_PLAN_FIELD_PATTERN.test(text)) return false;
  if (EXPLICIT_EXERCISE_ACTION_PATTERN.test(text)) return false;
  return !EXPLICIT_PLAN_LIFECYCLE_PATTERN.test(text);
}

function referencedTreatmentLabel(text: string): string {
  const match = /\b(?:tratamiento|plan)\s+de\s+(.+?)[.!?¡¿]*\s*$/i.exec(text.trim());
  return match?.[1]?.trim() ?? '';
}

function isContextlessConfirmation(text: string): boolean {
  return CONTEXTLESS_CONFIRMATION_PATTERN.test(text.trim());
}

/**
 * Safety clarification for a brand-new conversation where no prior turn can
 * contain the missing action or change. This intentionally avoids asking
 * Gemini to infer a mutation from an underspecified command or a bare
 * confirmation that has nothing to confirm.
 */
export function freshRequestClarification(text: string, hasConversationContext: boolean): string | undefined {
  if (hasConversationContext) return undefined;
  if (isContextlessConfirmation(text)) {
    return 'Necesito que me indiques qué acción quieres realizar antes de poder hacerlo.';
  }
  if (!isFreshUnderspecifiedPlanMutation(text)) return undefined;
  const label = referencedTreatmentLabel(text);
  return label
    ? `¿Qué quieres modificar del tratamiento de ${label}?`
    : '¿Qué quieres modificar del tratamiento o plan?';
}