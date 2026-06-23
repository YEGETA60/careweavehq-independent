import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createChatCompletion, hasAIProvider } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Caregiver = {
  id: string;
  name: string;
  skills: string[] | null;
  certifications: string[] | null;
  hourly_wage: number | null;
  status: string | null;
  user_id: string | null;
  company_id: string | null;
};

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function weekStart(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { shift_id } = await req.json();
    if (!shift_id) {
      return new Response(JSON.stringify({ error: "shift_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // verify caller (RLS check via user-scoped client)
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: shiftAccess } = await userClient
      .from("open_shifts")
      .select("id")
      .eq("id", shift_id)
      .maybeSingle();
    if (!shiftAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: shift } = await supabase
      .from("open_shifts")
      .select("*")
      .eq("id", shift_id)
      .single();
    if (!shift) throw new Error("Shift not found");

    const { data: client } = await supabase
      .from("clients")
      .select("id, name, address, lat, lng, company_id")
      .eq("id", shift.client_id)
      .single();

    const companyId = shift.company_id || client?.company_id;
    const { data: caregivers } = await supabase
      .from("caregivers")
      .select("id, name, skills, certifications, hourly_wage, status, user_id, company_id")
      .eq("company_id", companyId)
      .eq("status", "active");

    const ws = weekStart(shift.date);
    const dayOfWeek = new Date(shift.date + "T00:00:00Z").getUTCDay();
    const shiftHours = hoursBetween(shift.start_time, shift.end_time);

    // Pull weekly hours + availability + same-day visits for conflict detection
    const cgIds = (caregivers ?? []).map((c) => c.id);
    const [{ data: weekVisits }, { data: avails }, { data: dayVisits }, { data: timeOff }] =
      await Promise.all([
        supabase
          .from("visits")
          .select("caregiver_id, date, start_time, end_time, verified_start_time, verified_end_time")
          .in("caregiver_id", cgIds)
          .gte("date", ws),
        supabase
          .from("caregiver_availability")
          .select("caregiver_id, day_of_week, start_time, end_time, max_hours_per_week, active")
          .in("caregiver_id", cgIds)
          .eq("day_of_week", dayOfWeek)
          .eq("active", true),
        supabase
          .from("visits")
          .select("caregiver_id, start_time, end_time")
          .in("caregiver_id", cgIds)
          .eq("date", shift.date),
        supabase
          .from("caregiver_time_off")
          .select("caregiver_id, start_date, end_date")
          .in("caregiver_id", cgIds)
          .lte("start_date", shift.date)
          .gte("end_date", shift.date)
          .catch(() => ({ data: [] as any[] })),
      ]);

    const candidates = (caregivers ?? []).map((c: Caregiver) => {
      const requiredSkills = (shift.skills_required ?? []) as string[];
      const requiredCerts = (shift.certifications_required ?? []) as string[];
      const cgSkills = c.skills ?? [];
      const cgCerts = c.certifications ?? [];
      const skillsHit = requiredSkills.filter((s) => cgSkills.includes(s));
      const certsHit = requiredCerts.filter((s) => cgCerts.includes(s));
      const skillsMatch =
        requiredSkills.length === 0
          ? 1
          : skillsHit.length / requiredSkills.length;
      const certsMatch =
        requiredCerts.length === 0
          ? 1
          : certsHit.length / requiredCerts.length;

      const cgWeekHours = (weekVisits ?? [])
        .filter((v) => v.caregiver_id === c.id)
        .reduce(
          (acc, v) =>
            acc +
            hoursBetween(
              v.verified_start_time || v.start_time,
              v.verified_end_time || v.end_time
            ),
          0
        );
      const projectedWeek = cgWeekHours + shiftHours;
      const otRisk = projectedWeek > 40 ? Math.min(1, (projectedWeek - 40) / 10) : 0;

      const onTimeOff = (timeOff ?? []).some((t: any) => t.caregiver_id === c.id);

      const dayConflicts = (dayVisits ?? []).filter((v: any) => {
        if (v.caregiver_id !== c.id) return false;
        return !(v.end_time <= shift.start_time || v.start_time >= shift.end_time);
      });

      const avail = (avails ?? []).find((a: any) => a.caregiver_id === c.id);
      const inAvailability =
        !!avail &&
        avail.start_time <= shift.start_time &&
        avail.end_time >= shift.end_time;

      // distance unknown unless we have caregiver home address — skip for now
      const score =
        0.45 * skillsMatch +
        0.25 * certsMatch +
        0.15 * (inAvailability ? 1 : 0) +
        0.15 * (1 - otRisk) -
        (dayConflicts.length > 0 ? 1 : 0) -
        (onTimeOff ? 1 : 0);

      return {
        id: c.id,
        name: c.name,
        skills_match: Math.round(skillsMatch * 100),
        certs_match: Math.round(certsMatch * 100),
        week_hours_now: Math.round(cgWeekHours * 10) / 10,
        projected_week_hours: Math.round(projectedWeek * 10) / 10,
        ot_risk: Math.round(otRisk * 100),
        in_availability: inAvailability,
        day_conflict: dayConflicts.length > 0,
        on_time_off: onTimeOff,
        score: Math.round(score * 100) / 100,
      };
    });

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 8);

    // Ask the configured AI provider to add a short rationale + final ranking.
    let aiRanked: any[] = top;
    if (hasAIProvider() && top.length > 0) {
      const aiResp = await createChatCompletion(
        {
          messages: [
            {
              role: "system",
              content:
                "You are a homecare scheduling assistant. Rank caregivers for an open shift. Penalize day_conflict, on_time_off, and high ot_risk strongly. Reward high skills_match and certs_match. Return concise rationales (max 18 words).",
            },
            {
              role: "user",
              content: JSON.stringify({
                shift: {
                  date: shift.date,
                  start_time: shift.start_time,
                  end_time: shift.end_time,
                  duration_hours: shiftHours,
                  client: client?.name,
                  skills_required: shift.skills_required,
                  certifications_required: shift.certifications_required,
                },
                candidates: top,
              }),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "rank_candidates",
                description: "Return ranked caregiver list with rationales.",
                parameters: {
                  type: "object",
                  properties: {
                    ranked: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          rationale: { type: "string" },
                          recommendation: {
                            type: "string",
                            enum: ["best_fit", "good_fit", "backup", "not_recommended"],
                          },
                        },
                        required: ["id", "rationale", "recommendation"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["ranked"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "rank_candidates" } },
        },
        {
          lovableModel: "google/gemini-3-flash-preview",
          directModel: "gpt-4.1-mini",
          modelEnv: "AI_SHIFT_MODEL",
        },
      );

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI provider credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.ok) {
        const aiJson = await aiResp.json();
        const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
        if (call?.function?.arguments) {
          try {
            const parsed = JSON.parse(call.function.arguments);
            const byId = new Map(top.map((c) => [c.id, c]));
            aiRanked = (parsed.ranked || [])
              .map((r: any) => {
                const base = byId.get(r.id);
                if (!base) return null;
                return { ...base, rationale: r.rationale, recommendation: r.recommendation };
              })
              .filter(Boolean);
          } catch (_) {
            // fall back to deterministic order
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        shift: {
          id: shift.id,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          duration_hours: shiftHours,
          client_name: client?.name,
        },
        candidates: aiRanked,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-shift-matcher error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
