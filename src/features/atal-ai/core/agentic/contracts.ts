import type { ConfirmationProof, ToolExecutionResult, ToolInvocation } from '../contracts';

export type AgentAttachmentRef = {
  id: string;
  name: string;
  type: string;
  kind: 'image' | 'pdf' | 'audio';
  data?: string;
};

export type AgentHistoryContent = {
  role: 'user' | 'model';
  parts: Array<Record<string, unknown>>;
};

export type AgentFunctionCall = {
  id: string;
  bridge: 'atal_read' | 'atal_action';
  functionName?: string;
  tool: string;
  input: unknown;
  references: Array<{ type: string; id?: string; label?: string; parent?: unknown }>;
};

export type AgentModelTurn = {
  text: string;
  calls: AgentFunctionCall[];
  modelContent?: AgentHistoryContent;
  interactionId?: string;
};

export type AgentTurnRequest = {
  conversationId: string;
  text: string;
  route: string;
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
  selectedSessionId: string;
  allowedTools: string[];
  conversationHistory: AgentHistoryContent[];
  history: AgentHistoryContent[];
  attachments: AgentAttachmentRef[];
  previousInteractionId?: string;
};

export type AgentTaskStatus =
  | 'running'
  | 'completed'
  | 'needs-clarification'
  | 'needs-confirmation'
  | 'blocked'
  | 'failed'
  | 'cancelled';

export type AgentStepResult = {
  callId: string;
  invocation: ToolInvocation;
  result: ToolExecutionResult;
};

export type AgentTaskState = {
  id: string;
  conversationId: string;
  goal: string;
  status: AgentTaskStatus;
  stepCount: number;
  maxSteps: number;
  allowedTools: string[];
  history: AgentHistoryContent[];
  completed: AgentStepResult[];
  seenCallSignatures: string[];
  pendingInvocation?: ToolInvocation;
  pendingCall?: AgentFunctionCall;
  finalText: string;
  error?: string;
  interactionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentExecutionContext = {
  conversationId: string;
  draftId: string;
  route: string;
  selectedPatientId: string;
  selectedPlanId: string;
  selectedExerciseId: string;
  selectedSessionId: string;
  now: string;
};

export type AgentModelRequester = (request: AgentTurnRequest, signal?: AbortSignal) => Promise<AgentModelTurn>;
export type AgentToolExecutor = (invocation: ToolInvocation, confirmation?: ConfirmationProof) => ToolExecutionResult;

export type AgentLoopInput = {
  task: AgentTaskState;
  request: Omit<AgentTurnRequest, 'allowedTools' | 'history'>;
  context: AgentExecutionContext;
  requestModel: AgentModelRequester;
  executeTool: AgentToolExecutor;
  signal?: AbortSignal;
};

export type AgentLoopOutcome = {
  task: AgentTaskState;
  lastResults: AgentStepResult[];
};
