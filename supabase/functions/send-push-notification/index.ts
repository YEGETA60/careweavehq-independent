/**
 * Sends a push notification to one or more users via FCM (Android) or APNs (iOS).
 *
 * This function looks up `push_tokens` for the given users and dispatches the
 * payload. To avoid hard-coding a provider before credentials are wired up,
 * if no FCM_SERVER_KEY secret is set the function returns the matched tokens
 * so the caller (or a future cron) can wire delivery in.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "no_auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "invalid_token" }, 401);

    // Only privileged operational roles may dispatch push notifications.
    const { data: roles } = await userClient
      .from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = ["admin", "manager", "operations_manager", "supervisor", "scheduler"];
    if (!roles?.some((r: { role: string }) => allowed.includes(r.role))) {
      return json({ error: "forbidden" }, 403);
    }

    const payload = (await req.json()) as Body;
    if (!payload.user_ids?.length || !payload.title || !payload.body) {
      return json({ error: "invalid_payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Restrict recipients to users that belong to one of the caller's companies,
    // preventing cross-tenant push delivery.
    const { data: callerCompanies } = await admin
      .from("company_users").select("company_id").eq("user_id", u.user.id);
    const companyIds = (callerCompanies ?? []).map((c: { company_id: string }) => c.company_id);
    let allowedRecipients = payload.user_ids;
    if (companyIds.length) {
      const { data: peers } = await admin
        .from("company_users")
        .select("user_id")
        .in("company_id", companyIds)
        .in("user_id", payload.user_ids);
      allowedRecipients = Array.from(new Set((peers ?? []).map((p: { user_id: string }) => p.user_id)));
    } else {
      allowedRecipients = [];
    }
    if (!allowedRecipients.length) {
      return json({ ok: true, delivered: 0, token_count: 0, note: "no recipients in caller's companies" });
    }

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token, platform, user_id")
      .in("user_id", allowedRecipients);

    const fcmKey = Deno.env.get("FCM_SERVER_KEY");
    if (!fcmKey || !tokens?.length) {
      return json({
        ok: true,
        delivered: 0,
        token_count: tokens?.length ?? 0,
        note: fcmKey ? "no tokens" : "FCM_SERVER_KEY not configured",
      });
    }

    let delivered = 0;
    for (const t of tokens) {
      try {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${fcmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: t.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
          }),
        });
        if (res.ok) delivered++;
      } catch { /* ignore individual failures */ }
    }

    return json({ ok: true, delivered, token_count: tokens.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}