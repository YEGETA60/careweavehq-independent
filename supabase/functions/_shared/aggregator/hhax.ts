// HHAeXchange adapter. Real production endpoints are under
//   https://api.hhaexchange.com/  (REST) or SFTP for batch.
// We implement a clean shape and fall back to deterministic mocks
// when no API key is configured (test environment).

import type { AggregatorAdapter, AggregatorAck, InboundEvent, ConnectionConfig, OutboundEventType } from "./types.ts";

export function createHhaxAdapter(cfg: ConnectionConfig): AggregatorAdapter {
  const baseUrl = cfg.api_base_url
    ?? (cfg.environment === "prod"
      ? "https://api.hhaexchange.com/v1"
      : "https://api.test.hhaexchange.com/v1");

  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${cfg.api_key ?? ""}`,
    "X-Agency-Id": cfg.agency_id ?? "",
    "X-Provider-Id": cfg.provider_id ?? "",
  });

  const useMock = !cfg.api_key;

  async function push(eventType: OutboundEventType, payload: Record<string, unknown>): Promise<AggregatorAck> {
    if (useMock) {
      // Mock: accept anything, generate ack id
      return {
        ok: true,
        status: "accepted",
        vendor_ack_id: `mock-${eventType}-${crypto.randomUUID().slice(0, 8)}`,
        raw: { mock: true, payload },
      };
    }
    const path = pathFor(eventType);
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    if (!res.ok) {
      return { ok: false, status: "rejected", error: `HHAX ${res.status}: ${text.slice(0, 500)}`, raw: body };
    }
    const b = (body ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      status: (b.status as "accepted" | "pending") ?? "accepted",
      vendor_ack_id: (b.id as string) ?? (b.ackId as string) ?? undefined,
      raw: body,
    };
  }

  async function pull(sinceISO: string): Promise<InboundEvent[]> {
    if (useMock) return [];
    const res = await fetch(`${baseUrl}/notifications?since=${encodeURIComponent(sinceISO)}`, {
      method: "GET",
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray((data as Record<string, unknown>).items)
      ? ((data as Record<string, unknown>).items as Record<string, unknown>[])
      : [];
    return items.map((it) => ({
      vendor_event_id: String(it.id ?? crypto.randomUUID()),
      event_type: String(it.type ?? "unknown"),
      payload: it,
      occurred_at: it.occurred_at as string | undefined,
    }));
  }

  async function ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const t0 = Date.now();
    if (useMock) return { ok: true, latencyMs: 0 };
    try {
      const res = await fetch(`${baseUrl}/health`, { headers: headers() });
      return { ok: res.ok, latencyMs: Date.now() - t0, error: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return { vendor: "hhax", push, pull, ping };
}

function pathFor(eventType: OutboundEventType): string {
  switch (eventType) {
    case "visit_create":
    case "visit_update":
    case "visit_verify":
    case "visit_cancel":
      return "/visits";
    case "authorization_create":
    case "authorization_update":
      return "/authorizations";
    case "patient_create":
    case "patient_update":
      return "/patients";
    case "employee_create":
    case "employee_update":
      return "/employees";
  }
}

/** Map our visit row + related entities to HHAX visit payload shape. */
export function mapVisitToHhax(v: Record<string, unknown>, opts: {
  client?: Record<string, unknown>;
  caregiver?: Record<string, unknown>;
  authorization?: Record<string, unknown>;
}): Record<string, unknown> {
  const c = opts.client ?? {};
  const cg = opts.caregiver ?? {};
  const auth = opts.authorization ?? {};
  return {
    Patient: {
      MedicaidID: c.medicaid_id ?? null,
      ExternalID: c.id ?? null,
      FirstName: c.first_name ?? c.name ?? null,
      LastName: c.last_name ?? null,
      DOB: c.dob ?? null,
    },
    Caregiver: {
      UniqueID: cg.npi ?? cg.id ?? null,
      FirstName: cg.first_name ?? null,
      LastName: cg.last_name ?? null,
    },
    Authorization: {
      AuthNumber: auth.auth_number ?? null,
      ServiceCode: auth.service_code ?? null,
    },
    Visit: {
      ExternalVisitID: v.id,
      ServiceDate: v.date,
      ScheduledStart: v.start_time,
      ScheduledEnd: v.end_time,
      VisitStartDateTime: v.verified_start_time ?? v.start_time,
      VisitEndDateTime: v.verified_end_time ?? v.end_time,
      VisitConfirmationMethod: (v.evv_method as string) ?? "GPS",
      VerificationStatus: v.verification_status ?? "Verified",
      GeoCoordinates: {
        StartLat: v.gps_start_lat ?? null,
        StartLng: v.gps_start_lng ?? null,
        EndLat: v.gps_end_lat ?? null,
        EndLng: v.gps_end_lng ?? null,
      },
      TasksCompleted: v.tasks_completed ?? [],
    },
  };
}