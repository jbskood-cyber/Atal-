import type { AtalState } from '@/src/data/atalStore';
import { ActionExecutionError } from '../../../domain/actions/contracts';
import { validateActionStateInvariants } from '../../../domain/actions/stateInvariants';
import { coreError } from './contracts';

export function validateAtalStateInvariants(candidate: AtalState, previous?: AtalState): void {
  try {
    validateActionStateInvariants(candidate, previous);
  } catch (error) {
    if (error instanceof ActionExecutionError) throw coreError(error.code, error.message);
    throw error;
  }
}
