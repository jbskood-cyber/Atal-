import { readFileSync, writeFileSync } from 'node:fs';

function replace(path, before, after) {
  const original = readFileSync(path, 'utf8');
  if (original.includes(after)) return;
  if (!original.includes(before)) throw new Error(`Expected text not found in ${path}: ${before}`);
  writeFileSync(path, original.replace(before, after), 'utf8');
}

replace(
  'src/features/atal-ai/core/tools/universalPatientTools.ts',
  'export const universalPatientTools: ToolDefinition[] = [',
  'export const universalPatientTools: ToolDefinition<any>[] = [',
);
replace(
  'src/features/atal-ai/core/tools/universalPatientTools.ts',
  "const affected = [{ type: 'patient' as const, id: patientId }, { type: 'clinical-record' as const, id: recordId }];",
  "const affected: Array<{ type: 'patient' | 'clinical-record' | 'plan'; id: string }> = [{ type: 'patient', id: patientId }, { type: 'clinical-record', id: recordId }];",
);
replace(
  'src/features/atal-ai/core/tools/universalPlanExerciseTools.ts',
  'export const universalPlanExerciseTools: ToolDefinition[] = [',
  'export const universalPlanExerciseTools: ToolDefinition<any>[] = [',
);
replace(
  'src/features/atal-ai/core/tools/clientEffectTools.ts',
  'export const clientEffectTools: ToolDefinition[] = [',
  'export const clientEffectTools: ToolDefinition<any>[] = [',
);
replace(
  'src/features/atal-ai/core/tools/universalSessionSettingsTools.ts',
  'export const universalSessionSettingsTools: ToolDefinition[] = [',
  'export const universalSessionSettingsTools: ToolDefinition<any>[] = [',
);

console.log('Fixed Block 4.3 action tool generic types.');
