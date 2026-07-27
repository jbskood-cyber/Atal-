const STRUCTURED_WRITE_TOOLS = new Set([
  'patient.create',
  'patient.update',
  'clinical_record.upsert',
  'plan.create_simple',
  'plan.update_fields',
  'plan.duplicate',
  'exercise.create_simple',
  'exercise.update_fields',
  'exercise.duplicate',
  'settings.profile_update',
]);

const FIELD_PREFIXES: Record<string, RegExp[]> = {
  name: [
    /^(?:el\s+)?nombre(?:\s+del\s+(?:paciente|ejercicio)|\s+de\s+la\s+copia)?\s+(?:es|sería|será)\s+/i,
    /^se\s+llama\s+/i,
  ],
  professionalName: [/^(?:el\s+)?nombre\s+profesional\s+(?:es|sería|será)\s+/i],
  specialty: [/^(?:la\s+)?especialidad\s+(?:es|sería|será)\s+/i],
  clinic: [/^(?:la\s+)?clínica\s+(?:es|sería|será)\s+/i, /^(?:el\s+)?nombre\s+de\s+la\s+clínica\s+(?:es|sería|será)\s+/i],
  title: [/^(?:el\s+)?título(?:\s+del\s+plan|\s+de\s+la\s+copia)?\s+(?:es|sería|será)\s+/i],
  phone: [/^(?:el|su)\s+teléfono\s+(?:es|sería|será)\s+/i, /^teléfono\s*:\s*/i],
  email: [/^(?:el|su)\s+correo(?:\s+electrónico)?\s+(?:es|sería|será)\s+/i, /^correo(?:\s+electrónico)?\s*:\s*/i],
  address: [/^(?:la|su)\s+dirección\s+(?:es|sería|será)\s+/i, /^dirección\s*:\s*/i],
  emergencyContact: [/^(?:el|su)\s+contacto\s+de\s+emergencia\s+(?:es|sería|será)\s+/i, /^contacto\s+de\s+emergencia\s*:\s*/i],
  affectedArea: [/^(?:la\s+)?zona\s+afectada\s+(?:es|sería|será)\s+/i, /^zona\s+afectada\s*:\s*/i],
  diagnosis: [/^(?:el\s+)?diagnóstico(?:\s+proporcionado)?\s+(?:es|sería|será)\s+/i, /^diagnóstico\s*:\s*/i],
  providedDiagnosis: [/^(?:el\s+)?diagnóstico(?:\s+proporcionado)?\s+(?:es|sería|será)\s+/i, /^diagnóstico\s*:\s*/i],
  reasonForVisit: [/^(?:el\s+)?motivo(?:\s+de\s+consulta)?\s+(?:es|sería|será)\s+/i, /^motivo(?:\s+de\s+consulta)?\s*:\s*/i],
  evolution: [/^(?:la\s+)?evolución\s+(?:es|sería|será)\s+/i, /^evolución\s*:\s*/i],
  focus: [/^(?:el\s+)?enfoque(?:\s+del\s+plan)?\s+(?:es|sería|será)\s+/i, /^enfoque\s*:\s*/i],
  duration: [/^(?:la\s+)?duración(?:\s+del\s+plan)?\s+(?:es|sería|será)\s+/i, /^duración\s*:\s*/i],
  frequency: [/^(?:la\s+)?frecuencia(?:\s+del\s+plan)?\s+(?:es|sería|será)\s+/i, /^frecuencia\s*:\s*/i],
  goal: [/^(?:el\s+)?objetivo(?:\s+del\s+plan)?\s+(?:es|sería|será)\s+/i, /^objetivo\s*:\s*/i],
  progression: [/^(?:la\s+)?progresión\s+(?:es|sería|será)\s+/i, /^progresión\s*:\s*/i],
  reportCriteria: [/^(?:los\s+)?criterios(?:\s+de\s+reporte|\s+de\s+seguimiento)?\s+(?:son|serían|serán)\s+/i, /^criterios(?:\s+de\s+reporte|\s+de\s+seguimiento)?\s*:\s*/i],
  generalInstructions: [/^(?:las\s+)?indicaciones\s+generales\s+(?:son|serían|serán)\s+/i, /^indicaciones\s+generales\s*:\s*/i],
  region: [/^(?:la\s+)?región\s+(?:es|sería|será)\s+/i, /^región\s*:\s*/i],
  category: [/^(?:la\s+)?categoría\s+(?:es|sería|será)\s+/i, /^categoría\s*:\s*/i],
  objective: [/^(?:el\s+)?objetivo\s+(?:es|sería|será)\s+/i, /^objetivo\s*:\s*/i],
  startingPosition: [/^(?:la\s+)?posición\s+inicial\s+(?:es|sería|será)\s+/i, /^posición\s+inicial\s*:\s*/i],
  precautions: [/^(?:la\s+)?precaución\s+(?:es|sería|será)\s+/i, /^(?:las\s+)?precauciones\s+(?:son|serían|serán)\s+/i, /^precauciones?\s*:\s*/i],
};

const INSTRUCTION_PREFIXES = [
  /^(?:la\s+)?instrucción\s+(?:es|sería|será)\s+/i,
  /^(?:las\s+)?instrucciones\s+(?:son|serían|serán)\s+/i,
  /^instrucciones?\s*:\s*/i,
];

const EXERCISE_DOSE_PREFIX = /^(\d+)\s+series?\s*(?:de|x|×)\s*(\d+)\s*(?:repeticiones|repetición|reps?)\b\s*[.;,:-]?\s*/i;

function stripPrefix(value: string, patterns: RegExp[]): string {
  let next = value.trim();
  for (const pattern of patterns) {
    const stripped = next.replace(pattern, '').trim();
    if (stripped !== next) return stripped;
  }
  return next;
}

function stripMatchingExerciseDose(value: string, sets: unknown, repetitions: unknown): string {
  if (typeof sets !== 'number' || typeof repetitions !== 'number') return value;
  const match = value.trim().match(EXERCISE_DOSE_PREFIX);
  if (!match || Number(match[1]) !== sets || Number(match[2]) !== repetitions) return value;
  return value.trim().slice(match[0].length).trim();
}

function normalizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const normalized = Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, normalizeValue(childKey, child)]));
  if (Array.isArray(normalized.instructions)) {
    normalized.instructions = normalized.instructions
      .map((item) => typeof item === 'string' ? stripMatchingExerciseDose(item, normalized.sets, normalized.repetitions) : item)
      .filter((item) => typeof item !== 'string' || item.length > 0);
  }
  return normalized;
}

function normalizeValue(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    const patterns = FIELD_PREFIXES[key];
    return patterns ? stripPrefix(value, patterns) : value;
  }
  if (key === 'instructions' && Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' ? stripPrefix(item, INSTRUCTION_PREFIXES) : item);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return normalizeObject(value as Record<string, unknown>);
}

export function normalizeStructuredToolInput(tool: string, input: unknown): unknown {
  if (!STRUCTURED_WRITE_TOOLS.has(tool) || !input || typeof input !== 'object' || Array.isArray(input)) return input;
  return normalizeObject(input as Record<string, unknown>);
}
