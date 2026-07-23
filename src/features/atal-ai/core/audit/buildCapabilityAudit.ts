import { atalAIToolRegistry } from '../executionEngine';
import { validateCapabilityAudit, type CapabilityAuditRow } from './capabilityCatalog';
import { currentAICoverage } from './currentAICoverage';
import { manualCapabilityInventory } from './manualCapabilityInventory';

export function buildCapabilityAudit(): CapabilityAuditRow[] {
  const coverage = new Map(currentAICoverage.map((item) => [item.capabilityId, item]));
  const registered = new Set(atalAIToolRegistry.list().map((tool) => tool.name));

  const rows = manualCapabilityInventory.map((manual) => {
    const mapped = coverage.get(manual.id);
    if (!mapped) throw new TypeError(`Missing AI coverage classification: ${manual.id}`);

    for (const tool of [...mapped.readTools, ...mapped.actionTools]) {
      if (!registered.has(tool)) throw new TypeError(`Capability ${manual.id} references unregistered tool ${tool}`);
    }

    const { capabilityId: _capabilityId, ...ai } = mapped;
    return { ...manual, ...ai };
  });

  if (coverage.size !== rows.length) {
    const manualIds = new Set(rows.map((row) => row.id));
    const orphan = currentAICoverage.find((item) => !manualIds.has(item.capabilityId));
    if (orphan) throw new TypeError(`AI coverage references unknown capability: ${orphan.capabilityId}`);
  }

  return validateCapabilityAudit(rows);
}

export const capabilityAuditRows = buildCapabilityAudit();
