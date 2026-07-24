import {
  ActionExecutionError,
  type ActionUndoReceipt,
} from '../../../domain/actions/contracts';
import { executeActionTransaction } from '../../../domain/actions/actionTransaction';
import { atalStorePort } from './atalStorePort';
import {
  CoreExecutionError,
  coreError,
  type StorePort,
  type ToolSuccess,
  type TransactionOutcome,
  type TransactionRequest,
  type UndoReceipt,
} from './contracts';
import { decideExecutionPolicy } from './riskPolicy';

function toAiUndoReceipt(receipt: ActionUndoReceipt | undefined, tool: string): UndoReceipt | undefined {
  if (!receipt) return undefined;
  return {
    id: receipt.id,
    transactionId: receipt.transactionId,
    tool,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    consumedAt: receipt.consumedAt,
    patches: receipt.patches,
    generatedEventIds: receipt.generatedEventIds,
    generatedNotificationIds: receipt.generatedNotificationIds,
  };
}

export function executeMutationTransaction<TInput, TData = unknown>(
  request: TransactionRequest<TInput, TData>,
  port: StorePort = atalStorePort,
): TransactionOutcome<TData> {
  if (!request.definition.mutates || request.definition.risk === 'read') {
    throw coreError('CORE_EXECUTION_FAILED', 'Una herramienta de lectura no puede entrar en una transacción.');
  }

  const decision = decideExecutionPolicy(request.definition, request.invocation, request.confirmation, request.context.now);
  if (decision.mode !== 'none') {
    if (decision.mode === 'blocked') throw coreError('CORE_EXTERNAL_BLOCKED', decision.reason);
    throw coreError(request.confirmation ? 'CORE_CONFIRMATION_STALE' : 'CORE_CONFIRMATION_REQUIRED', decision.reason);
  }

  try {
    const shared = executeActionTransaction({
      action: request.definition.name,
      now: request.context.now,
      origin: {
        type: request.context.assistantScope === 'contextual' ? 'atal-ai-contextual' : 'atal-ai-general',
        conversationId: request.context.conversationId,
        draftId: request.context.draftId,
        toolName: request.definition.name,
        toolVersion: request.definition.version,
        riskLevel: request.definition.risk,
        confirmationId: request.confirmation?.id,
      },
      supportsUndo: request.definition.supportsUndo,
      undoTtlMs: request.definition.undoTtlMs,
      mutate(candidate, transactionId) {
        const environment = {
          state: candidate,
          context: request.context,
          resolved: request.resolved,
          transactionId,
        };

        try {
          request.definition.preconditions(environment, request.invocation.input);
        } catch (error) {
          if (error instanceof CoreExecutionError) throw error;
          throw coreError(
            'CORE_PRECONDITION_FAILED',
            error instanceof Error ? error.message : 'No se cumplieron las condiciones de la acción.',
          );
        }

        try {
          return request.definition.execute(environment, request.invocation.input) as ToolSuccess<TData>;
        } catch (error) {
          if (error instanceof CoreExecutionError) throw error;
          throw coreError(
            'CORE_EXECUTION_FAILED',
            error instanceof Error ? error.message : 'No se pudo ejecutar la acción.',
          );
        }
      },
    }, port);

    const undo = toAiUndoReceipt(shared.undo, request.definition.name);
    return {
      status: 'success',
      message: shared.message,
      summary: shared.summary,
      data: shared.data as TData | undefined,
      href: shared.href,
      affected: shared.affected,
      undo,
      clientEffect: shared.clientEffect,
      transactionId: shared.transactionId,
      committedAt: shared.committedAt,
    };
  } catch (error) {
    if (error instanceof CoreExecutionError) throw error;
    if (error instanceof ActionExecutionError) throw coreError(error.code, error.message);
    throw error;
  }
}
