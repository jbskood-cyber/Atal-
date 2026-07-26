export type RawAgentFunctionCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
};

const PATIENT_LIST_ALIASES = new Set([
  'get_patients',
  'list_patients',
  'patient.list',
]);

/**
 * Gemini occasionally emits a semantically obvious read alias instead of the
 * exact declared function name, even while function calling is restricted.
 * Normalize only narrow, read-only aliases that can be mapped without changing
 * user intent. Unknown actions remain untouched and are rejected by the normal
 * allow-list path.
 */
export function normalizeAgentFunctionCall(
  call: RawAgentFunctionCall,
  allowedFunctionNames: readonly string[],
): RawAgentFunctionCall {
  const name = call.name?.trim() ?? '';
  if (!name || allowedFunctionNames.includes(name)) return call;

  const normalized = name.toLocaleLowerCase('en-US');
  if (allowedFunctionNames.includes('atal_app_read') && PATIENT_LIST_ALIASES.has(normalized)) {
    return {
      ...call,
      name: 'atal_app_read',
      args: {
        ...(call.args ?? {}),
        resource: 'patients',
      },
    };
  }

  return call;
}
