// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RemitLine {
  claim_number?: string;
  invoice_id?: string;
  claim_id?: string;
  amount: number;
  adjustment?: number;
  payment_date?: string;
  reference?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json() as {
      payer_id: string;
      remit_number: string;
      check_or_eft_number?: string;
      payment_date: string;
      payment_method?: string;
      total_paid: number;
      lines: RemitLine[];
    };
    if (!body.payer_id || !body.remit_number || !body.payment_date || !Array.isArray(body.lines)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    const company_id = prof?.default_company_id;

    const { data: remit, error: rErr } = await sb.from("remittances").insert({
      company_id,
      payer_id: body.payer_id,
      remit_number: body.remit_number,
      check_or_eft_number: body.check_or_eft_number,
      payment_date: body.payment_date,
      payment_method: body.payment_method ?? "EFT",
      total_paid: body.total_paid,
      posted_at: new Date().toISOString(),
      posted_by: u.user.id,
    }).select("id").single();
    if (rErr || !remit) throw rErr ?? new Error("remit failed");

    const results: any[] = [];
    for (const line of body.lines) {
      let claimId = line.claim_id ?? null;
      let invoiceId = line.invoice_id ?? null;

      if (!claimId && line.claim_number) {
        const { data: cl } = await sb.from("claims").select("id, invoice_id").eq("claim_number", line.claim_number).maybeSingle();
        claimId = cl?.id ?? null;
        invoiceId = invoiceId ?? cl?.invoice_id ?? null;
      } else if (claimId && !invoiceId) {
        const { data: cl } = await sb.from("claims").select("invoice_id").eq("id", claimId).maybeSingle();
        invoiceId = cl?.invoice_id ?? null;
      }

      if (claimId) {
        await sb.from("claim_payments").insert({
          company_id,
          claim_id: claimId,
          remittance_id: remit.id,
          payer_id: body.payer_id,
          payment_date: line.payment_date ?? body.payment_date,
          amount: line.amount,
          adjustment: line.adjustment ?? 0,
          payment_type: "insurance",
          reference: line.reference,
        });
        const { data: cl } = await sb.from("claims").select("total_charge,total_paid,total_adjusted").eq("id", claimId).maybeSingle();
        if (cl) {
          const newPaid = Number(cl.total_paid ?? 0) + Number(line.amount);
          const newAdj = Number(cl.total_adjusted ?? 0) + Number(line.adjustment ?? 0);
          const remaining = Number(cl.total_charge) - newPaid - newAdj;
          const status = remaining <= 0.01 ? "paid" : (newPaid > 0 ? "partial" : "submitted");
          await sb.from("claims").update({ total_paid: newPaid, total_adjusted: newAdj, status }).eq("id", claimId);
        }
      }

      if (invoiceId) {
        const { data: inv } = await sb.from("invoices").select("amount,paid_amount").eq("id", invoiceId).maybeSingle();
        if (inv) {
          const newPaid = Number(inv.paid_amount ?? 0) + Number(line.amount);
          const balance = Number(inv.amount) - newPaid;
          const status = balance <= 0.01 ? "Paid" : "Pending";
          await sb.from("invoices").update({
            paid_amount: newPaid,
            balance,
            paid_date: status === "Paid" ? (line.payment_date ?? body.payment_date) : null,
            status,
          }).eq("id", invoiceId);
        }
      }
      results.push({ claim_id: claimId, invoice_id: invoiceId, applied: line.amount });
    }

    return new Response(JSON.stringify({ remittance_id: remit.id, applied: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});