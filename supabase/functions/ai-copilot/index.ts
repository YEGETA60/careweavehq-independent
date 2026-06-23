import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createChatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "explain_roster" | "draft_message" | "suggest_guide";

function hoursBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + (bm || 0) - (ah * 60 + (am || 0))) / 60;
}

async function callGateway(messages: any[]) {
  const resp = await createChatCompletion(
    { messages },
    {
      lovableModel: "google/gemini-2.5-flash",
      directModel: "gpt-4.1-mini",
      modelEnv: "AI_COPILOT_MODEL",
    },
  );
  if (resp.status === 429) {
    const err: any = new Error("Rate limit reached. Try again shortly.");
    err.status = 429;
    throw err;
  }
  if (resp.status === 402) {
    const err: any = new Error("AI provider credits exhausted.");
    err.status = 402;
    throw err;
  }
  if (!resp.ok) {
    throw new Error(`AI provider error: ${resp.status}`);
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action: Action = body.action;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowedRoles = ["admin", "manager", "operations_manager", "scheduler", "supervisor"];
    if (!roleRows?.some((r: any) => allowedRoles.includes(r.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("default_company_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    const companyId = prof?.default_company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "No company on profile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "explain_roster") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: visits } = await supabase
        .from("visits")
        .select("id, date, start_time, end_time, status, caregiver_id, client_id, verified_start_time, verified_end_time, clock_in_location, clock_out_location")
        .eq("company_id", companyId)
        .eq("date", today);
      const cgIds = Array.from(new Set((visits ?? []).map((v: any) => v.caregiver_id).filter(Boolean)));
      const clIds = Array.from(new Set((visits ?? []).map((v: any) => v.client_id).filter(Boolean)));
      const [{ data: cgs }, { data: cls }] = await Promise.all([
        supabase.from("caregivers").select("id, name").in("id", cgIds),
        supabase.from("clients").select("id, name").in("id", clIds),
      ]);
      const cgName = (id: string) => (cgs ?? []).find((c: any) => c.id === id)?.name ?? "Unknown";
      const clName = (id: string) => (cls ?? []).find((c: any) => c.id === id)?.name ?? "—";

      const summary = (visits ?? []).map((v: any) => {
        const actualStart = v.clock_in_location ? (v.verified_start_time || v.start_time) : null;
        let late = 0;
        if (actualStart && actualStart > v.start_time) {
          late = Math.round(hoursBetween(v.start_time, actualStart) * 60);
        }
        const absent = !actualStart && v.status === "Scheduled";
        return {
          caregiver: cgName(v.caregiver_id),
          client: clName(v.client_id),
          scheduled_start: v.start_time,
          actual_start: actualStart,
          status: v.status,
          late_minutes: late,
          absent,
        };
      });

      const msg = await callGateway([
        {
          role: "system",
          content:
            "You are CareWeave Co-Pilot, an operations analyst for a home care agency. The user is asking why caregivers were late or absent today. Be specific, factual, and brief. Use bullet points. Never invent reasons; if data shows lateness with no cause, say so and suggest next steps (call caregiver, check traffic, reassign). 120 words max.",
        },
        {
          role: "user",
          content: `Today's roster:\n${JSON.stringify(summary, null, 2)}\n\nWhy is anyone late or absent today? What should the scheduler do next?`,
        },
      ]);
      return new Response(JSON.stringify({ text: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "draft_message") {
      const { audience = "family", context = "", tone = "warm and professional" } = body;
      const msg = await callGateway([
        {
          role: "system",
          content: `You are CareWeave Co-Pilot, drafting a short message from a home care agency to a ${audience}. Tone: ${tone}. Keep it under 120 words. No emojis. Start with a greeting and end with a clear next step or sign-off. Do not invent details.`,
        },
        {
          role: "user",
          content: `Draft a message about: ${context || "a general update"}`,
        },
      ]);
      return new Response(JSON.stringify({ text: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suggest_guide") {
      const question = String(body.question ?? "").slice(0, 600);
      const tours: Array<{ id: string; title: string; description: string }> = Array.isArray(body.tours) ? body.tours : [];
      const modules = [
        "clients","intake","caregivers","credentials","scheduling","recurring","careplans","notes",
        "clinical","schedintel","payers","billing","autobilling","revenue","claims837","payroll",
        "documents","sandata","reports","training","hr","compliance","messages","livemap","company",
        "aggregator","manual",
      ];
      const sys =
        "You are CareWeave Co-Pilot helping an agency admin find the right place in the app. " +
        "Given the user question, a list of available guided tours, and a list of module ids, " +
        "respond with STRICT JSON only (no prose). Shape: {\"tour\": string|null, \"module\": string|null, \"hint\": string}. " +
        "If a tour clearly fits, set tour to its id. Otherwise set tour to null, pick the best matching module id, " +
        "and write a 1-3 sentence hint guiding the user on what to click. Never invent module ids or tour ids.";
      const raw = await callGateway([
        { role: "system", content: sys },
        {
          role: "user",
          content:
            `Question: ${question}\n\nTours:\n${JSON.stringify(tours)}\n\nModules:\n${JSON.stringify(modules)}`,
        },
      ]);
      let parsed: any = { tour: null, module: null, hint: raw };
      try {
        const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
        parsed = JSON.parse(cleaned);
      } catch {
        /* fall back to raw text as hint */
      }
      if (parsed.tour && !tours.some((t) => t.id === parsed.tour)) parsed.tour = null;
      if (parsed.module && !modules.includes(parsed.module)) parsed.module = null;
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-copilot error:", e);
    const status = e?.status || 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
