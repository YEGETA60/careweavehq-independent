// Twilio Voice IVR webhook for caregivers without smartphones.
// Flow:
//   1) Twilio POSTs to /telephony-evv with Caller, CallSid, Digits.
//   2) We resolve caller -> caregiver via telephony_phone_registry.
//   3) Caller presses 1 (clock in) or 2 (clock out); we update the visit.
// Returns TwiML (XML).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};
const xml = (s: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${s}`, {
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });

function say(msg: string, gather = false) {
  if (gather) {
    return xml(`<Response><Gather numDigits="1" action="" method="POST" timeout="6">
<Say voice="Polly.Joanna">${msg}</Say></Gather>
<Say voice="Polly.Joanna">No input received. Goodbye.</Say><Hangup/></Response>`);
  }
  return xml(`<Response><Say voice="Polly.Joanna">${msg}</Say><Hangup/></Response>`);
}

// Validates the X-Twilio-Signature header per
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
async function isValidTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // Constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Twilio sends application/x-www-form-urlencoded
  const form = await req.formData().catch(() => null);
  if (!form) return say("System error.");

  // Verify request actually came from Twilio
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const signature = req.headers.get("X-Twilio-Signature") ?? "";
  if (!authToken) {
    console.error("telephony-evv: TWILIO_AUTH_TOKEN not configured");
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = v.toString();
  // Twilio signs the public webhook URL. Honor X-Forwarded-Proto/Host when present.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const path = new URL(req.url).pathname + new URL(req.url).search;
  const fullUrl = `${proto}://${host}${path}`;
  const ok = signature && await isValidTwilioSignature(authToken, signature, fullUrl, params);
  if (!ok) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const caller = (form.get("From") ?? form.get("Caller") ?? "").toString();
  const digits = (form.get("Digits") ?? "").toString();
  const callSid = (form.get("CallSid") ?? "").toString();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: reg } = await admin.from("telephony_phone_registry")
    .select("*").eq("phone_e164", caller).eq("active", true).maybeSingle();

  if (!reg) {
    await admin.from("telephony_clock_events").insert({
      event_type: "unknown", caller_phone: caller, call_sid: callSid,
      raw_payload: Object.fromEntries(form),
    });
    return say("This phone number is not registered. Please contact your agency.");
  }

  if (!digits) {
    return say("Welcome to Care Weave EVV. Press 1 to clock in. Press 2 to clock out.", true);
  }

  const event_type = digits === "1" ? "clock_in" : digits === "2" ? "clock_out" : "unknown";
  if (event_type === "unknown") return say("Invalid selection. Goodbye.");

  // Find today's visit for this caregiver
  const today = new Date().toISOString().slice(0, 10);
  const { data: visit } = await admin.from("visits").select("*")
    .eq("caregiver_id", reg.caregiver_id).eq("date", today)
    .order("start_time").limit(1).maybeSingle();

  let visitUpdated = false;
  if (visit) {
    const nowHHMM = new Date().toISOString().slice(11, 16);
    const patch: any = event_type === "clock_in"
      ? { verified_start_time: nowHHMM, verification_status: "Verified", status: "InProgress",
          verification_method: "telephony" }
      : { verified_end_time: nowHHMM, status: "Completed", verification_method: "telephony" };
    const { error } = await admin.from("visits").update(patch).eq("id", visit.id);
    visitUpdated = !error;
  }

  await admin.from("telephony_clock_events").insert({
    company_id: reg.company_id, caregiver_id: reg.caregiver_id,
    visit_id: visit?.id ?? null, event_type, caller_phone: caller,
    ani: caller, call_sid: callSid, raw_payload: Object.fromEntries(form),
  });

  const verb = event_type === "clock_in" ? "clocked in" : "clocked out";
  return say(visitUpdated
    ? `You are now ${verb}. Thank you. Goodbye.`
    : `${verb} event recorded but no scheduled visit was found. Goodbye.`);
});