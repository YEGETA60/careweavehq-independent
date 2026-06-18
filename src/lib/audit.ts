import { auditPhi } from "@/lib/phiAudit";

/**
 * @deprecated Use `auditPhi` from `@/lib/phiAudit` directly. This shim routes
 * legacy calls into the new append-only `phi_audit_logs` pipeline.
 */
export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  await auditPhi({ action, entity, entityId, metadata });
}