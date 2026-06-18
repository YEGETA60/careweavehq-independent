// deno-lint-ignore-file
// Sends email + SMS reminders to unsigned roles for a timesheet.
// Idempotent throttle: skips if last reminder for the same (timesheet,role,channel) was within COOLDOWN_HOURS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_HOURS = 24;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const lk = Deno.env.get("LOVABLE_API_KEY");
  const tk = Deno.env.get("TWILIO_API_KEY");
  if (!lk || !tk || !TWILIO_FROM) return { ok: false, error: "twilio_not_configured" };
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lk}`,
        "X-Connection-Api-Key": tk,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `twilio_${r.status}:${t.slice(0,160)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "sms_failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { timesheet_id, force, sign_url_base } = await req.json();
    if (!timesheet_id) return new Response(JSON.stringify({ error: "timesheet_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ts } = await sb.from("timesheets").select("*").eq("id", timesheet_id).maybeSingle();
    if (!ts) return new Response(JSON.stringify({ error: "Timesheet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (ts.status === "locked" || ts.status === "signed") {
      return new Response(JSON.stringify({ skipped: "locked" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: client }, { data: caregiver }, { data: signers }, { data: sigs }] = await Promise.all([
      sb.from("clients").select("name").eq("id", ts.client_id).maybeSingle(),
      sb.from("caregivers").select("name").eq("id", ts.caregiver_id).maybeSingle(),
      sb.from("timesheet_signers").select("*").eq("timesheet_id", timesheet_id),
      sb.from("timesheet_signatures").select("role").eq("timesheet_id", timesheet_id),
    ]);
    const signedRoles = new Set((sigs ?? []).map((s: any) => s.role));
    const pending = (signers ?? []).filter((s: any) => !signedRoles.has(s.role));

    const sinceIso = new Date(Date.now() - COOLDOWN_HOURS * 3600 * 1000).toISOString();
    const { data: recent } = await sb.from("timesheet_reminders_log")
      .select("role, channel, sent_at").eq("timesheet_id", timesheet_id).gte("sent_at", sinceIso);
    const recentKey = new Set((recent ?? []).map((r: any) => `${r.role}:${r.channel}`));

    const signUrl = sign_url_base ? `${sign_url_base}?timesheet=${timesheet_id}` : null;
    const baseData = {
      clientName: client?.name ?? "—",
      caregiverName: caregiver?.name ?? "—",
      periodStart: ts.period_start,
      periodEnd: ts.period_end,
      evvHours: Number(ts.evv_hours).toFixed(2),
      approvedHours: Number(ts.approved_hours).toFixed(2),
      variance: Number(ts.variance_hours).toFixed(2),
      mismatchCount: ts.evv_mismatch_count ?? 0,
      signUrl,
    };

    const results: any[] = [];
    for (const s of pending) {
      // Email
      const emailKey = `${s.role}:email`;
      if (s.signer_email && (force || !recentKey.has(emailKey))) {
        const idem = `ts-sign-${timesheet_id}-${s.role}-${Date.now()}`;
        const { error } = await sb.functions.invoke("send-transactional-email", {
          body: {
            templateName: "timesheet-signing-reminder",
            recipientEmail: s.signer_email,
            idempotencyKey: idem,
            templateData: { ...baseData, recipientName: s.signer_name, role: s.role },
          },
        });
        await sb.from("timesheet_reminders_log").insert({
          timesheet_id, role: s.role, channel: "email",
          recipient: s.signer_email, status: error ? "failed" : "sent",
          error: error ? String(error.message ?? error) : null,
        });
        results.push({ role: s.role, channel: "email", ok: !error });
      }
      // SMS
      const smsKey = `${s.role}:sms`;
      if (s.signer_phone && (force || !recentKey.has(smsKey))) {
        const body = `${baseData.clientName} timesheet (${baseData.periodStart}–${baseData.periodEnd}) needs your signature as ${s.role}.${baseData.mismatchCount ? ` ⚠ ${baseData.mismatchCount} EVV mismatch.` : ""}${signUrl ? ` ${signUrl}` : ""}`;
        const r = await sendSms(s.signer_phone, body.slice(0, 320));
        await sb.from("timesheet_reminders_log").insert({
          timesheet_id, role: s.role, channel: "sms",
          recipient: s.signer_phone, status: r.ok ? "sent" : "failed",
          error: r.ok ? null : r.error,
        });
        results.push({ role: s.role, channel: "sms", ok: r.ok, error: r.error });
      }
    }

    await sb.from("timesheets").update({ reminder_last_sent_at: new Date().toISOString() }).eq("id", timesheet_id);
    return new Response(JSON.stringify({ pending: pending.length, sent: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});