import type {
  ConfirmationMode,
  ConfirmationProof,
  PolicyDecision,
  ToolDefinition,
  ToolInvocation,
  ToolRisk,
} from './contracts';
import { fingerprintInvocation } from './stableValue';

const MAX_CONFIRMATION_AGE_MS = 5 * 60 * 1000;
const PROOF_STRENGTH: Record<ConfirmationProof['mode'], number> = {
  review: 1,
  explicit: 2,
  reinforced: 3,
};

const REQUIRED_MODE: Record<ToolRisk, ConfirmationMode> = {
  read: 'none',
  draft: 'review',
  'reversible-write': 'review',
  'sensitive-write': 'explicit',
  destructive: 'reinforced',
  external: 'blocked',
};

function proofIsValid(
  proof: ConfirmationProof,
  fingerprint: string,
  required: ConfirmationProof['mode'],
  now: string,
): boolean {
  const nowMs = Date.parse(now);
  const confirmedAtMs = Date.parse(proof.confirmedAt);
  const expiresAtMs = Date.parse(proof.expiresAt);
  if (![nowMs, confirmedAtMs, expiresAtMs].every(Number.isFinite)) return false;
  if (proof.fingerprint !== fingerprint) return false;
  if (confirmedAtMs > nowMs || expiresAtMs <= nowMs) return false;
  if (nowMs - confirmedAtMs > MAX_CONFIRMATION_AGE_MS) return false;
  return PROOF_STRENGTH[proof.mode] >= PROOF_STRENGTH[required];
}

export function decideExecutionPolicy(
  definition: ToolDefinition,
  invocation: ToolInvocation,
  proof: ConfirmationProof | undefined,
  now: string,
): PolicyDecision {
  const fingerprint = fingerprintInvocation(invocation);
  if (definition.blockedReason) {
    return { mode: 'blocked', fingerprint, reason: definition.blockedReason };
  }
  const required = REQUIRED_MODE[definition.risk];

  if (required === 'none') {
    return { mode: 'none', fingerprint, reason: 'La consulta no modifica datos.' };
  }
  if (required === 'blocked') {
    return { mode: 'blocked', fingerprint, reason: 'Esta capacidad no está disponible en el Bloque 4.1.' };
  }
  if (definition.risk === 'draft') {
    return { mode: 'review', fingerprint, reason: 'El borrador debe revisarse antes de aplicar cambios.' };
  }

  if (proof && proofIsValid(proof, fingerprint, required, now)) {
    return { mode: 'none', fingerprint, reason: 'Confirmación válida para esta propuesta.' };
  }

  const staleReason = proof
    ? 'La confirmación ya no corresponde a esta propuesta o expiró.'
    : 'La acción requiere confirmación antes de ejecutarse.';
  return { mode: required, fingerprint, reason: staleReason };
}
