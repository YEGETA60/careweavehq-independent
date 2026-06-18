// State Aggregator adapter contract (HHAeXchange / Sandata / Tellus / AuthentiCare)

export type AggregatorVendor = "hhax" | "sandata" | "tellus" | "authenticare";

export type OutboundEventType =
  | "visit_create" | "visit_update" | "visit_cancel" | "visit_verify"
  | "authorization_create" | "authorization_update"
  | "patient_create" | "patient_update"
  | "employee_create" | "employee_update";

export interface AggregatorAck {
  ok: boolean;
  vendor_ack_id?: string;
  status: "accepted" | "rejected" | "pending";
  raw?: unknown;
  error?: string;
}

export interface InboundEvent {
  vendor_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at?: string;
}

export interface AggregatorAdapter {
  vendor: AggregatorVendor;
  push(eventType: OutboundEventType, payload: Record<string, unknown>): Promise<AggregatorAck>;
  pull(sinceISO: string): Promise<InboundEvent[]>;
  ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

export interface ConnectionConfig {
  vendor: AggregatorVendor;
  state: string;
  environment: "test" | "prod";
  api_base_url?: string;
  agency_id?: string;
  provider_id?: string;
  api_key?: string;       // resolved from secret ref by caller
  config?: Record<string, unknown>;
}