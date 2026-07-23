import { readFileSync, writeFileSync } from 'node:fs';

function apply(path, replacements) {
  let content = readFileSync(path, 'utf8');
  for (const [before, after] of replacements) {
    if (content.includes(after)) continue;
    if (!content.includes(before)) throw new Error(`Expected text not found in ${path}: ${before.slice(0, 100)}`);
    content = content.replace(before, after);
  }
  writeFileSync(path, content, 'utf8');
}

apply('src/features/atal-ai/core/agentic/agentLoop.ts', [
  [
`function callSignature(call: AgentFunctionCall): string {
  return stableSerialize({ tool: call.tool, input: call.input, references: call.references });
}
`,
`function callSignature(call: AgentFunctionCall): string {
  return stableSerialize({ tool: call.tool, input: call.input, references: call.references });
}

function resultMessage(result: ToolExecutionResult): string {
  if (result.status === 'success') return result.message;
  if (result.status === 'clarification') return result.clarification.message;
  if (result.status === 'confirmation-required') return result.decision.reason;
  return result.message;
}
`,
  ],
  [
`      message: result.status === 'success'
        ? result.message
        : result.status === 'clarification'
          ? result.clarification.message
          : result.message,`,
`      message: resultMessage(result),`,
  ],
  [
`  next.finalText = result.status === 'success' ? ''
    : result.status === 'clarification' ? result.clarification.message
      : result.message;`,
`  next.finalText = result.status === 'success' ? '' : resultMessage(result);`,
  ],
]);

apply('src/features/atal-ai/core/tools/universalPatientTools.ts', [
  ["input.plan.exerciseIds.some((id) =>", "input.plan.exerciseIds.some((id: string) =>"],
  ["exerciseIds: [...new Set(input.plan.exerciseIds)]", "exerciseIds: [...new Set<string>(input.plan.exerciseIds as string[])]"],
]);

apply('src/features/atal-ai/core/tools/universalPlanExerciseTools.ts', [
  ["input.exerciseIds.some((id) =>", "input.exerciseIds.some((id: string) =>"],
  ["input.exerciseIds.every((id) =>", "input.exerciseIds.every((id: string) =>"],
]);

console.log('Fixed remaining Block 4.3 compile errors.');
