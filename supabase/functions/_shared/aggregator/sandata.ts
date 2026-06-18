// Sandata adapter (Aggregator EVV).
// Sandata exposes:
//   - REST Aggregator API:  https://api.sandata.com/aggregator/v2/
//       endpoints commonly used:
//         POST /visits        (create/update visit)
//         POST /clients       (member upsert)
//         POST /employees     (employee upsert)
//         POST /visits/{id}/cancel
//         GET  /notifications?since=...
//   - SOAP / SFTP batch flows for legacy programs (CSV "Visit Maintenance" files).
//
// We implement a clean REST shape and fall back to deterministic mocks
// when no API key is configured (test/sandbox).
//
// Field mapping notes (Sandata "Provider Aggregator EVV Vendor" spec):
//   - Member          ~= our "client"            (ClientID / ClientMedicaidID)
//   - Employee        ~= our "caregiver"         (EmployeeIdentifier / EmployeeSSN / EmployeeOtherID)
//   - Visit           ~= our "visit"             (VisitOtherID = ExternalVisitID)
//   - GroupCode       ~= short agency code (Provider ID issued by Sandata, e.g. "1234")
//   - Account         ~= state program identifier (e.g. NYCHRRA, FLMCD)
//   - Calls           ~= EVV clock-in/out events with verification reason codes

import type {
  AggregatorAdapter,
  AggregatorAck,
  InboundEvent,
  ConnectionConfig,
  OutboundEventType,
} from "./types.ts";

export function createSandataAdapter(cfg: ConnectionConfig): AggregatorAdapter {
  const baseUrl =
    cfg.api_base_url ??
    (cfg.environment === "prod"
      ? "https://api.sandata.com/aggregator/v2"
      : "https://api-uat.sandata.com/aggregator/v2");

  // Sandata uses Account + GroupCode + Bearer token in headers
  const headers = () => ({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${cfg.api_key ?? ""}`,
    "Account": String(cfg.config?.account ?? cfg.provider_id ?? ""),
    "GroupCode": String(cfg.config?.group_code ?? cfg.agency_id ?? ""),
  });

  const useMock = !cfg.api_key;

  async function push(
    eventType: OutboundEventType,
    payload: Record<string, unknown>,
  ): Promise<AggregatorAck> {
    if (useMock) {
      return {
        ok: true,
        status: "accepted",
        vendor_ack_id: `sandata-mock-${eventType}-${crypto.randomUUID().slice(0, 8)}`,
        raw: { mock: true, payload },
      };
    }

    const { path, method } = routeFor(eventType, payload);
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: headers(),
      body: method === "GET" ? undefined : JSON.stringify(payload),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }

    if (!res.ok) {
      return {
        ok: false,
        status: "rejected",
        error: `Sandata ${res.status}: ${text.slice(0, 500)}`,
        raw: body,
      };
    }

    const b = (body ?? {}) as Record<string, unknown>;
    // Sandata usually responds with { status, transactionId, errors[] }
    const errors = Array.isArray(b.errors) ? (b.errors as unknown[]) : [];
    if (errors.length > 0) {
      return {
        ok: false,
        status: "rejected",
        error: `Sandata validation: ${JSON.stringify(errors).slice(0, 500)}`,
        vendor_ack_id: (b.transactionId as string) ?? undefined,
        raw: body,
      };
    }
    const status = String(b.status ?? "accepted").toLowerCase();
    return {
      ok: true,
      status: status === "pending" ? "pending" : "accepted",
      vendor_ack_id: (b.transactionId as string) ?? (b.id as string) ?? undefined,
      raw: body,
    };
  }

  async function pull(sinceISO: string): Promise<InboundEvent[]> {
    if (useMock) return [];
    const res = await fetch(
      `${baseUrl}/notifications?since=${encodeURIComponent(sinceISO)}`,
      { method: "GET", headers: headers() },
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray((data as Record<string, unknown>).notifications)
      ? ((data as Record<string, unknown>).notifications as Record<string, unknown>[])
      : Array.isArray((data as Record<string, unknown>).items)
        ? ((data as Record<string, unknown>).items as Record<string, unknown>[])
        : [];
    return items.map((it) => ({
      vendor_event_id: String(it.notificationId ?? it.id ?? crypto.randomUUID()),
      event_type: String(it.eventType ?? it.type ?? "unknown"),
      payload: it,
      occurred_at: (it.eventDateTime as string) ?? (it.occurred_at as string) ?? undefined,
    }));
  }

  async function ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const t0 = Date.now();
    if (useMock) return { ok: true, latencyMs: 0 };
    try {
      const res = await fetch(`${baseUrl}/health`, { headers: headers() });
      return {
        ok: res.ok,
        latencyMs: Date.now() - t0,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (e) {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return { vendor: "sandata", push, pull, ping };
}

function routeFor(
  eventType: OutboundEventType,
  payload: Record<string, unknown>,
): { path: string; method: "POST" | "PUT" | "GET" } {
  switch (eventType) {
    case "visit_create":
      return { path: "/visits", method: "POST" };
    case "visit_update":
    case "visit_verify": {
      const id = (payload?.Visit as Record<string, unknown> | undefined)?.VisitOtherID
        ?? payload.visit_id;
      return { path: id ? `/visits/${encodeURIComponent(String(id))}` : "/visits", method: "PUT" };
    }
    case "visit_cancel": {
      const id = (payload?.Visit as Record<string, unknown> | undefined)?.VisitOtherID
        ?? payload.visit_id;
      return { path: `/visits/${encodeURIComponent(String(id))}/cancel`, method: "POST" };
    }
    case "authorization_create":
    case "authorization_update":
      return { path: "/authorizations", method: "POST" };
    case "patient_create":
    case "patient_update":
      return { path: "/clients", method: "POST" };
    case "employee_create":
    case "employee_update":
      return { path: "/employees", method: "POST" };
  }
}

/** Map our visit row + related entities to Sandata Aggregator visit payload shape. */
export function mapVisitToSandata(
  v: Record<string, unknown>,
  opts: {
    client?: Record<string, unknown>;
    caregiver?: Record<string, unknown>;
    authorization?: Record<string, unknown>;
    account?: string;
    group_code?: string;
  },
): Record<string, unknown> {
  const c = opts.client ?? {};
  const cg = opts.caregiver ?? {};
  const auth = opts.authorization ?? {};

  const startISO = combineDateTime(v.date, v.verified_start_time ?? v.start_time);
  const endISO = combineDateTime(v.date, v.verified_end_time ?? v.end_time);

  const calls: Array<Record<string, unknown>> = [];
  if (v.verified_start_time) {
    calls.push({
      CallDateTime: startISO,
      CallAssignment: "TimeIn",
      CallType: (v.evv_method as string)?.toLowerCase() === "telephony" ? "TVV" : "MVV",
      MobileLogin: cg.user_id ?? cg.id ?? null,
      ClientIdentifierOnCall: c.medicaid_id ?? c.id ?? null,
      GroupCode: opts.group_code ?? null,
      CallLatitude: v.gps_start_lat ?? null,
      CallLongitude: v.gps_start_lng ?? null,
    });
  }
  if (v.verified_end_time) {
    calls.push({
      CallDateTime: endISO,
      CallAssignment: "TimeOut",
      CallType: (v.evv_method as string)?.toLowerCase() === "telephony" ? "TVV" : "MVV",
      MobileLogin: cg.user_id ?? cg.id ?? null,
      ClientIdentifierOnCall: c.medicaid_id ?? c.id ?? null,
      GroupCode: opts.group_code ?? null,
      CallLatitude: v.gps_end_lat ?? null,
      CallLongitude: v.gps_end_lng ?? null,
    });
  }

  return {
    Account: opts.account ?? null,
    GroupCode: opts.group_code ?? null,
    Client: {
      ClientID: c.id ?? null,
      ClientMedicaidID: c.medicaid_id ?? null,
      ClientFirstName: c.first_name ?? c.name ?? null,
      ClientLastName: c.last_name ?? null,
      ClientDateOfBirth: c.dob ?? null,
    },
    Employee: {
      EmployeeIdentifier: cg.id ?? null,
      EmployeeOtherID: cg.npi ?? null,
      EmployeeSSN: cg.ssn_last4 ?? null,
      EmployeeFirstName: cg.first_name ?? null,
      EmployeeLastName: cg.last_name ?? null,
    },
    Authorization: {
      AuthorizationNumber: auth.auth_number ?? null,
      ServiceCode: auth.service_code ?? null,
    },
    Visit: {
      VisitOtherID: v.id,
      ServiceDate: v.date,
      ScheduledVisitStart: combineDateTime(v.date, v.start_time),
      ScheduledVisitEnd: combineDateTime(v.date, v.end_time),
      VisitStartDateTime: startISO,
      VisitEndDateTime: endISO,
      VisitVerificationStatus: mapVerificationStatus(v.verification_status as string | undefined),
      VisitCancelledIndicator: v.status === "Cancelled" ? "Y" : "N",
      AdjustmentReasonCode: v.adjustment_reason_code ?? null,
      Calls: calls,
      TasksCompleted: (v.tasks_completed as unknown[]) ?? [],
      MemberPayer: (auth.payer_code as string) ?? null,
      ServiceType: (auth.service_code as string) ?? null,
    },
  };
}

function combineDateTime(date: unknown, time: unknown): string | null {
  if (!date || !time) return null;
  const d = String(date);
  const t = String(time);
  // Sandata wants ISO 8601 with offset; assume UTC if not present (the
  // verification trigger should populate UTC values, but we tolerate naive HH:MM)
  if (t.includes("T")) return t;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(t)) {
    const tt = t.length === 5 ? `${t}:00` : t;
    return `${d}T${tt}Z`;
  }
  return `${d}T${t}`;
}

function mapVerificationStatus(s?: string): string {
  switch ((s ?? "").toLowerCase()) {
    case "verified": return "Verified";
    case "manual-override":
    case "manual_override":
    case "override": return "ManuallyVerified";
    case "unverified":
    case "pending": return "Unverified";
    case "rejected": return "Rejected";
    default: return "Unverified";
  }
}