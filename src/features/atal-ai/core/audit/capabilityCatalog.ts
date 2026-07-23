import type { ToolRisk } from '../contracts';

export type CapabilityDomain =
  | 'patients'
  | 'clinical-records'
  | 'plans'
  | 'exercises'
  | 'sessions'
  | 'reports-activity'
  | 'delivery-exports'
  | 'profile-settings'
  | 'navigation-assistance';

export type CapabilityCoverage = 'covered' | 'partial' | 'missing' | 'excluded';
export type CapabilityDisposition = 'keep' | 'build' | 'exclude';
export type ConfirmationBehavior =
  | 'none'
  | 'explicit-request'
  | 'compact-review'
  | 'short-confirmation'
  | 'reinforced-confirmation'
  | 'blocked';
export type AuditBehavior = 'none' | 'activity-event' | 'transaction-event' | 'client-effect-only';
export type UndoBehavior = 'not-applicable' | 'validated-receipt' | 'manual-compensation' | 'not-supported';
export type MultimodalInput = 'text' | 'audio' | 'image' | 'pdf';

export type ManualCapability = {
  id: string;
  domain: CapabilityDomain;
  label: string;
  route: string;
  manualEntryPoint: string;
  canonicalPersistence: string[];
  currentTests: string[];
  risk: ToolRisk;
  confirmation: ConfirmationBehavior;
  audit: AuditBehavior;
  undo: UndoBehavior;
  multimodal: MultimodalInput[];
};

export type CapabilityAICoverage = {
  capabilityId: string;
  readTools: string[];
  actionTools: string[];
  coverage: CapabilityCoverage;
  gap: string;
  disposition: CapabilityDisposition;
};

export type CapabilityAuditRow = ManualCapability & Omit<CapabilityAICoverage, 'capabilityId'>;

export type CapabilityAuditSummary = {
  total: number;
  covered: number;
  partial: number;
  missing: number;
  excluded: number;
  parityPercent: number;
};

export function validateCapabilityAudit(rows: CapabilityAuditRow[]): CapabilityAuditRow[] {
  const ids = new Set<string>();

  for (const row of rows) {
    if (!row.id.trim()) throw new TypeError('Capability id is required.');
    if (ids.has(row.id)) throw new TypeError(`Duplicate capability id: ${row.id}`);
    ids.add(row.id);

    if (!row.label.trim()) throw new TypeError(`Capability ${row.id} has no label.`);
    if (!row.route.trim()) throw new TypeError(`Capability ${row.id} has no route.`);
    if (!row.manualEntryPoint.includes('#')) throw new TypeError(`Capability ${row.id} has no canonical entry point.`);
    if (!row.currentTests.length) throw new TypeError(`Capability ${row.id} has no test evidence.`);
    if (row.coverage !== 'covered' && !row.gap.trim()) throw new TypeError(`Capability ${row.id} requires an explicit gap.`);
    if (row.coverage === 'covered' && row.gap.trim()) throw new TypeError(`Capability ${row.id} is covered but still declares a gap.`);
    if (row.coverage === 'excluded' && row.disposition !== 'exclude') throw new TypeError(`Capability ${row.id} exclusion must use disposition exclude.`);
    if (row.coverage === 'covered' && row.disposition !== 'keep') throw new TypeError(`Capability ${row.id} coverage must use disposition keep.`);
    if ((row.coverage === 'partial' || row.coverage === 'missing') && row.disposition !== 'build') {
      throw new TypeError(`Capability ${row.id} implementation gap must use disposition build.`);
    }
  }

  return rows;
}

export function summarizeCapabilityAudit(rows: CapabilityAuditRow[]): CapabilityAuditSummary {
  const counts = { covered: 0, partial: 0, missing: 0, excluded: 0 };
  for (const row of rows) counts[row.coverage] += 1;
  const total = rows.length;

  return {
    total,
    ...counts,
    parityPercent: total ? Math.round((counts.covered / total) * 100) : 0,
  };
}
