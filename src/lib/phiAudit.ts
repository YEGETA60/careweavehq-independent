import { supabase } from "@/integrations/supabase/client";

export type PhiAction =
  | "read" | "list" | "create" | "update" | "delete"
  | "export" | "print" | "download"
  | "clock_in" | "clock_out" | "sign" | "login" | "impersonate"
  | string;

export type PhiEntity =
  | "client" | "caregiver" | "visit" | "care_plan" | "intake"
  | "credential" | "invoice" | "claim" | "timesheet"
  | "message" | "message_attachment" | "authorization" | string;

export interface AuditPhiArgs {
  action: PhiAction;
  entity: PhiEntity;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  field?: string;
  reason?: "treatment" | "payment" | "operations" | "patient_request" | string;
  source?: "web" | "mobile" | "edge_function" | "trigger" | "cron";
  metadata?: Record<string, unknown>;
}

// Per-tab request id correlates multi-row UI actions in the audit log
let requestId: string | null = null;
function getRequestId(): string {
  if (!requestId) requestId = crypto.randomUUID();
  return requestId;
}

/** Rotate the request id (call at the start of a discrete user action). */
export function newAuditRequestId(): string {
  requestId = crypto.randomUUID();
  return requestId;
}

/**
 * Centralized PHI audit writer. All access to and changes of PHI must go
 * through this helper (or the DB-side audit_phi_changes() trigger).
 * Never throws — audit failures must not break the user flow.
 */
export async function auditPhi(args: AuditPhiArgs): Promise<void> {
  try {
    await supabase.rpc("log_phi_event", {
      p_action: args.action,
      p_entity: args.entity,
      p_entity_id: args.entityId ?? null,
      p_before: (args.before ?? null) as never,
      p_after: (args.after ?? null) as never,
      p_field: args.field ?? null,
      p_reason: args.reason ?? "treatment",
      p_source: args.source ?? "web",
      p_metadata: {
        ...(args.metadata ?? {}),
        request_id: getRequestId(),
        url: typeof window !== "undefined" ? window.location.pathname : null,
      } as never,
    });
  } catch {
    // Swallow — never block PHI workflows on audit
  }
}