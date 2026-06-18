// Shared PHI audit helper for edge functions. Mirrors src/lib/phiAudit.ts.
// Writes to public.phi_audit_logs via the log_phi_event RPC using either
// the caller's auth (preferred — preserves actor_user_id/roles) or the
// service role (system jobs).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface EdgeAuditArgs {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  field?: string;
  reason?: string;
  source?: "edge_function" | "cron" | "mobile" | "web";
  metadata?: Record<string, unknown>;
}

export interface EdgeAuditContext {
  req: Request;
  /** When omitted, falls back to service-role client. */
  authHeader?: string | null;
}

function buildClient(authHeader?: string | null): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  if (authHeader) {
    return createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function auditPhiEdge(ctx: EdgeAuditContext, args: EdgeAuditArgs): Promise<void> {
  try {
    const headers = ctx.req.headers;
    const requestId =
      headers.get("x-request-id") ?? headers.get("x-correlation-id") ?? crypto.randomUUID();
    const ip =
      (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-real-ip") ||
      null;

    const client = buildClient(ctx.authHeader ?? headers.get("authorization"));
    await client.rpc("log_phi_event", {
      p_action: args.action,
      p_entity: args.entity,
      p_entity_id: args.entityId ?? null,
      p_before: (args.before ?? null) as never,
      p_after: (args.after ?? null) as never,
      p_field: args.field ?? null,
      p_reason: args.reason ?? "treatment",
      p_source: args.source ?? "edge_function",
      p_metadata: {
        ...(args.metadata ?? {}),
        request_id: requestId,
        ip,
        user_agent: headers.get("user-agent"),
        function: Deno.env.get("SUPABASE_FUNCTION_NAME") ?? null,
      } as never,
    });
  } catch {
    // Never let audit failures break an edge function
  }
}