import { supabase } from "@/integrations/supabase/client";

export type CtaVariant = { id: string; label: string; helper?: string };
export type CtaExperiment = {
  cta_id: string;
  variants: CtaVariant[];
};

const VISITOR_KEY = "cw_visitor_id";
const ASSIGN_KEY = "cw_cta_assignments";
const PENDING_KEY = "cw_cta_pending_conv";

/** Stable per-browser visitor id (cookie + localStorage). */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `v_${Math.random().toString(36).slice(2)}${Date.now()}`);
    localStorage.setItem(VISITOR_KEY, id);
    document.cookie = `${VISITOR_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
  }
  return id;
}

function readAssignments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "{}"); } catch { return {}; }
}
function writeAssignments(map: Record<string, string>) {
  localStorage.setItem(ASSIGN_KEY, JSON.stringify(map));
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministically pick a variant for a visitor, persisted. */
export function getVariant(exp: CtaExperiment): CtaVariant {
  const map = readAssignments();
  const existing = map[exp.cta_id];
  let chosen = exp.variants.find((v) => v.id === existing);
  if (!chosen) {
    const visitor = getVisitorId();
    const idx = hashStr(`${visitor}:${exp.cta_id}`) % exp.variants.length;
    chosen = exp.variants[idx];
    map[exp.cta_id] = chosen.id;
    writeAssignments(map);
  }
  return chosen;
}

/** Fire-and-forget event recorder. Never throws. */
export async function trackCtaEvent(
  cta_id: string,
  variant_id: string,
  event_type: "impression" | "click" | "conversion",
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("cta_events").insert({
      cta_id,
      variant_id,
      event_type,
      visitor_id: getVisitorId(),
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata,
    } as never);
  } catch {
    /* swallow */
  }
}

/** Remember a click so we can fire a conversion event later (e.g. after signup). */
export function markPendingConversion(cta_id: string, variant_id: string) {
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "[]") as Array<{ cta_id: string; variant_id: string; t: number }>;
    list.push({ cta_id, variant_id, t: Date.now() });
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-10)));
  } catch { /* ignore */ }
}

/** Fire conversion events for any pending clicks (call on signup success). */
export async function flushPendingConversions(extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  let list: Array<{ cta_id: string; variant_id: string; t: number }> = [];
  try { list = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "[]"); } catch { return; }
  if (!list.length) return;
  sessionStorage.removeItem(PENDING_KEY);
  // Only count clicks from the last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  await Promise.all(
    list
      .filter((e) => e.t >= cutoff)
      .map((e) => trackCtaEvent(e.cta_id, e.variant_id, "conversion", extra)),
  );
}