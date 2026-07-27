function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? '');
}

const TRANSIENT_PROVIDER_PATTERN = /quota|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|overload|timed? out|timeout|fetch failed|network/i;
const AUTH_CONFIGURATION_PATTERN = /GEMINI_API_KEY\s+no\s+configurada|API key not valid|invalid API key|UNAUTHENTICATED|PERMISSION_DENIED|\b401\b|\b403\b/i;

export function safeAgentProviderMessage(error: unknown): string {
  const message = rawMessage(error);
  if (TRANSIENT_PROVIDER_PATTERN.test(message)) {
    return 'Atal IA está temporalmente ocupada. No se perdió ningún cambio; vuelve a intentarlo en unos segundos.';
  }
  if (AUTH_CONFIGURATION_PATTERN.test(message)) {
    return 'Atal IA no está configurada todavía. Añade GEMINI_API_KEY como secreto del proyecto.';
  }
  if (/MODEL_EMPTY_RESPONSE/i.test(message)) return 'Atal IA no recibió una respuesta utilizable del modelo. Probamos modelos alternativos automáticamente; vuelve a intentarlo.';
  if (/CORE_INPUT_INVALID|schema|function call|response|JSON/i.test(message)) return 'No pude completar esa consulta con la información disponible. Puedes reformularla o decirme qué necesitas revisar.';
  if (/CORE_ENTITY_NOT_FOUND/i.test(message)) return 'No encontré una entidad que coincida con la solicitud.';
  if (/TOOL_NOT_ALLOWED/i.test(message)) return 'Esa acción no está disponible desde este contexto.';
  return message || 'Gemini no pudo continuar esta tarea. El trabajo completado sigue guardado.';
}

export function safeDraftProviderMessage(error: unknown): string {
  const message = rawMessage(error);
  if (TRANSIENT_PROVIDER_PATTERN.test(message)) {
    return 'Atal IA está temporalmente ocupada. Conservamos tu borrador; vuelve a intentarlo en unos segundos.';
  }
  if (AUTH_CONFIGURATION_PATTERN.test(message)) {
    return 'Atal IA no está configurada todavía. Añade GEMINI_API_KEY como secreto del proyecto en Google AI Studio y vuelve a intentarlo.';
  }
  if (/MODEL_EMPTY_RESPONSE/i.test(message)) return 'Gemini terminó el turno sin una respuesta utilizable. Conservamos tu entrada y probamos modelos alternativos automáticamente; vuelve a intentarlo.';
  if (/JSON|schema|response/i.test(message)) return 'Gemini devolvió una respuesta que no pudimos validar. Tu entrada sigue intacta; vuelve a intentarlo o edítala.';
  return message || 'Gemini no pudo procesar la solicitud. Tu contenido no se perdió.';
}
