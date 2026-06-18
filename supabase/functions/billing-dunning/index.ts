// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_THROTTLE_HOURS = 72;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await (async () => { try { return await req.json(); } catch { return {}; } })() as {
      invoice_ids?: string[];
      force?: boolean;
    };

    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    const company_id = prof?.default_company_id;
    if (!company_id) return new Response(JSON.stringify({ error: "No company" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let q = sb.from("invoices")
      .select("id, client_id, period_start, period_end, amount, paid_amount, balance, due_date, status, last_reminder_at, claim_id")
      .eq("company_id", company_id)
      .neq("status", "Paid");
    if (body.invoice_ids?.length) q = q.in("id", body.invoice_ids);
    const { data: invoices } = await q;

    const now = Date.now();
    const sent: any[] = [], skipped: any[] = [];

    for (const inv of invoices ?? []) {
      const balance = Number(inv.balance ?? (Number(inv.amount) - Number(inv.paid_amount ?? 0)));
      if (balance <= 0.01) continue;
      if (!body.force && inv.last_reminder_at) {
        const hrs = (now - new Date(inv.last_reminder_at).getTime()) / 3.6e6;
        if (hrs < REMINDER_THROTTLE_HOURS) { skipped.push({ id: inv.id, reason: "throttled" }); continue; }
      }

      const { data: client } = await sb.from("clients").select("name,email,phone").eq("id", inv.client_id).maybeSingle();
      if (!client?.email) { skipped.push({ id: inv.id, reason: "no email" }); continue; }

      const ageDays = Math.max(0, Math.floor((now - new Date(inv.due_date).getTime()) / 86400000));
      const invoiceNumber = inv.id.slice(0, 8).toUpperCase();

      // Enqueue email via shared transactional email function
      try {
        await sb.functions.invoke("send-transactional-email", {
          body: {
            template: "invoice-due",
            to: client.email,
            data: {
              recipientName: client.name,
              invoiceNumber,
              clientName: client.name,
              periodStart: inv.period_start,
              periodEnd: inv.period_end,
              amountDue: balance.toFixed(2),
              ageDays,
              dueDate: inv.due_date,
            },
            purpose: "transactional",
            idempotency_key: `invoice-due:${inv.id}:${new Date().toISOString().slice(0, 10)}`,
          },
        });
      } catch (e) {
        console.error("send-transactional-email failed", e);
      }

      await sb.from("invoices").update({ last_reminder_at: new Date().toISOString() }).eq("id", inv.id);
      await sb.from("dunning_log").insert({
        company_id,
        invoice_id: inv.id,
        claim_id: inv.claim_id,
        recipient_email: client.email,
        channel: "email",
        age_days: ageDays,
        amount_due: balance,
        status: "sent",
      });
      sent.push({ invoice_id: inv.id, age_days: ageDays, amount_due: balance });
    }

    return new Response(JSON.stringify({ sent_count: sent.length, sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});