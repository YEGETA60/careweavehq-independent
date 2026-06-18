// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Lightweight parser for 999 / 277CA / 835.
 *  Detects accept/reject status and pulls out high-level fields and errors.
 */
function detectAckType(payload: string): "999" | "277CA" | "835" | "unknown" {
  if (/\bST\*999\*/.test(payload)) return "999";
  if (/\bST\*277\*/.test(payload)) return "277CA";
  if (/\bST\*835\*/.test(payload)) return "835";
  return "unknown";
}

function splitSegs(payload: string): string[][] {
  return payload.replace(/\r/g, "").split(/~\s*/).filter(Boolean).map((s) => s.split("*"));
}

function parse999(segs: string[][]) {
  let status = "accepted";
  const errors: any[] = [];
  for (const s of segs) {
    if (s[0] === "IK5" && s[1] && s[1] !== "A") status = "rejected";
    if (s[0] === "AK9" && s[1] && s[1] !== "A") status = "rejected";
    if (s[0] === "IK3" || s[0] === "IK4" || s[0] === "CTX") errors.push(s);
  }
  return { status, errors };
}

function parse277(segs: string[][]) {
  const errors: any[] = [];
  let status = "accepted";
  for (const s of segs) {
    if (s[0] === "STC") {
      const code = (s[1] || "").split(":")[0];
      // A* = accepted, anything else flag
      if (code && !code.startsWith("A")) {
        status = "rejected";
        errors.push({ code, segment: s });
      }
    }
  }
  return { status, errors };
}

function parse835(segs: string[][]) {
  const payments: any[] = [];
  let totalPaid = 0;
  for (const s of segs) {
    if (s[0] === "BPR") totalPaid += Number(s[2] || 0);
    if (s[0] === "CLP") payments.push({ patient_control: s[1], status: s[2], total_charge: Number(s[3] || 0), paid: Number(s[4] || 0), patient_resp: Number(s[5] || 0), payer_claim: s[7] });
  }
  return { status: "paid", parsed: { payments, totalPaid } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json() as { submission_id?: string; file_name?: string; payload: string };
    if (!body.payload) return json({ error: "payload required" }, 400);

    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    const company_id = prof?.default_company_id;
    if (!company_id) return json({ error: "No default company" }, 400);

    const ackType = detectAckType(body.payload);
    const segs = splitSegs(body.payload);

    let status = "received";
    let parsed: any = {};
    let errors: any[] = [];

    if (ackType === "999") {
      const r = parse999(segs); status = r.status; errors = r.errors;
    } else if (ackType === "277CA") {
      const r = parse277(segs); status = r.status; errors = r.errors;
    } else if (ackType === "835") {
      const r = parse835(segs); status = r.status; parsed = r.parsed;
    }

    const { data: ackRow, error: ackErr } = await sb.from("claim_acknowledgments").insert({
      company_id,
      submission_id: body.submission_id ?? null,
      ack_type: ackType,
      status,
      file_name: body.file_name ?? null,
      raw_payload: body.payload.slice(0, 1_000_000),
      parsed,
      errors,
    }).select("id").single();
    if (ackErr) throw ackErr;

    // Update parent submission status field
    if (body.submission_id) {
      const update: any = {};
      if (ackType === "999") update.ack_999_status = status;
      if (ackType === "277CA") update.ack_277ca_status = status;
      if (ackType === "835") update.era_835_status = status;
      if (Object.keys(update).length) {
        await sb.from("claim_submissions").update(update).eq("id", body.submission_id);
      }

      // Parity check: compare actual ACK against expected_ack stored at generation time.
      const { data: sub } = await sb.from("claim_submissions")
        .select("expected_ack, test_mode, parity_status, parity_diff")
        .eq("id", body.submission_id).maybeSingle();
      if (sub?.expected_ack && sub?.test_mode) {
        const expected: any = sub.expected_ack[ackType] ?? null;
        const diff: any[] = [];
        let parityOk = true;
        if (ackType === "999" && expected) {
          if (expected.expected_status !== status) {
            diff.push({ field: "999.status", expected: expected.expected_status, actual: status });
            parityOk = false;
          }
          const actualCodes = errors.map((e: any) => Array.isArray(e) ? e[1] : (e?.code || null)).filter(Boolean);
          for (const code of expected.expected_error_codes ?? []) {
            if (!actualCodes.includes(code)) {
              diff.push({ field: "999.missing_error_code", expected: code, actual: null });
              parityOk = false;
            }
          }
        }
        if (ackType === "277CA" && expected) {
          if (expected.expected_status !== status) {
            diff.push({ field: "277CA.status", expected: expected.expected_status, actual: status });
            parityOk = false;
          }
        }
        if (ackType === "835" && expected) {
          const expBilled = Number(expected.expected_total_billed || 0);
          const actBilled = (parsed.payments ?? []).reduce((s: number, p: any) => s + Number(p.total_charge || 0), 0);
          if (Math.abs(expBilled - actBilled) > 0.01) {
            diff.push({ field: "835.total_billed", expected: expBilled, actual: actBilled });
            parityOk = false;
          }
        }
        const merged = [...((sub.parity_diff as any[]) ?? []), ...diff];
        const finalStatus = merged.length === 0 ? "match" : "mismatch";
        await sb.from("claim_submissions").update({
          parity_status: finalStatus,
          parity_diff: merged,
          parity_checked_at: new Date().toISOString(),
        }).eq("id", body.submission_id);
      }
    }

    // For 835, post payments to claims/invoices
    if (ackType === "835" && parsed.payments?.length) {
      for (const p of parsed.payments) {
        if (!p.patient_control) continue;
        const { data: cl } = await sb.from("claims").select("id, invoice_id").eq("company_id", company_id).eq("claim_number", p.patient_control).maybeSingle();
        if (cl?.id) {
          await sb.from("claims").update({
            total_paid: p.paid,
            patient_responsibility: p.patient_resp,
            payer_claim_number: p.payer_claim,
            status: p.status === "1" || p.status === "2" ? "paid" : "partially_paid",
          }).eq("id", cl.id);
          if (cl.invoice_id) {
            await sb.from("invoices").update({
              paid_amount: p.paid,
              balance: Math.max(0, p.total_charge - p.paid),
              status: p.paid >= p.total_charge ? "Paid" : "Pending",
              paid_date: new Date().toISOString().slice(0, 10),
            }).eq("id", cl.invoice_id);
          }
        }
      }
    }

    return json({ ok: true, ack_id: ackRow?.id, ack_type: ackType, status, errors_count: errors.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});