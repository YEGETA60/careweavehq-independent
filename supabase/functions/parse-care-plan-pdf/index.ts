// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createChatCompletion, usesDirectAIProvider } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert at extracting structured data from US homecare/Medicaid Care Plan documents.
Care Plans come from many programs: IHSS (CO), CDASS, HCBS Waiver, State Plan Personal Care, Private Duty Nursing,
VA HHA, Private Pay, Long Term Care insurance, etc. Detect the program from the document — do NOT assume IHSS.

Return ALL care plan categories listed (e.g., Homemaker, Personal Care, Health Maintenance, Skilled Nursing, Respite,
Companion, Behavioral, Transportation, Supervision). Each category lists tasks with:
- minutes per task
- frequency per week (times/week)
- minutes per week = minutes_per_task * frequency_per_week

Extract verbatim where possible. Use null for unknown fields.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_care_plan",
    description: "Extract structured care plan data",
    parameters: {
      type: "object",
      properties: {
        program_type: { type: "string" },
        program_label: { type: "string" },
        client_name: { type: ["string","null"] },
        medicaid_id: { type: ["string","null"] },
        authorization_number: { type: ["string","null"] },
        case_manager_name: { type: ["string","null"] },
        case_manager_agency: { type: ["string","null"] },
        case_manager_phone: { type: ["string","null"] },
        effective_start: { type: ["string","null"] },
        effective_end: { type: ["string","null"] },
        diagnosis: { type: ["string","null"] },
        physician: { type: ["string","null"] },
        total_weekly_hours: { type: ["number","null"] },
        total_weekly_minutes: { type: ["integer","null"] },
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category_name: { type: "string" },
              category_code: { type: ["string","null"] },
              weekly_hours_approved: { type: "number" },
              weekly_minutes_approved: { type: "integer" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_name: { type: "string" },
                    minutes_per_task: { type: "integer" },
                    frequency_per_week: { type: "number" },
                    minutes_per_week: { type: "integer" },
                    notes: { type: ["string","null"] },
                  },
                  required: ["task_name","minutes_per_task","frequency_per_week","minutes_per_week"],
                },
              },
            },
            required: ["category_name","weekly_hours_approved","weekly_minutes_approved","tasks"],
          },
        },
        confidence: { type: "number" },
      },
      required: ["program_type","categories","confidence"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { document_id, client_id } = await req.json();
    if (!document_id || !client_id) return new Response(JSON.stringify({ error: "document_id and client_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: doc, error: docErr } = await sb.from("documents").select("storage_path, file_name, mime_type").eq("id", document_id).single();
    if (docErr || !doc) return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: file, error: fErr } = await sb.storage.from("documents").download(doc.storage_path);
    if (fErr || !file) return new Response(JSON.stringify({ error: "Cannot read document" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    const b64 = btoa(bin);
    const mime = doc.mime_type || "application/pdf";
    const fileContent = usesDirectAIProvider() && mime === "application/pdf"
      ? {
          type: "file",
          file: {
            filename: doc.file_name || "care-plan.pdf",
            file_data: `data:${mime};base64,${b64}`,
          },
        }
      : { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };

    const aiResp = await createChatCompletion(
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [
            { type: "text", text: `Extract the Care Plan from this document (${doc.file_name}). Detect program type — do not assume IHSS.` },
            fileContent,
          ]},
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "extract_care_plan" } },
      },
      {
        lovableModel: "google/gemini-2.5-pro",
        directModel: "gpt-4.1",
        modelEnv: "AI_VISION_MODEL",
      },
    );
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return new Response(JSON.stringify({ error: "No structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const parsed = JSON.parse(call.function.arguments);

    const { data: plan, error: pErr } = await sb.from("care_plans").insert({
      client_id,
      program_type: parsed.program_type,
      program_label: parsed.program_label ?? null,
      diagnosis: parsed.diagnosis ?? null,
      physician: parsed.physician ?? null,
      medicaid_id: parsed.medicaid_id ?? null,
      authorization_number: parsed.authorization_number ?? null,
      case_manager_name: parsed.case_manager_name ?? null,
      case_manager_agency: parsed.case_manager_agency ?? null,
      case_manager_phone: parsed.case_manager_phone ?? null,
      effective_start: parsed.effective_start ?? null,
      effective_end: parsed.effective_end ?? null,
      start_date: parsed.effective_start ?? null,
      review_date: parsed.effective_end ?? null,
      total_weekly_minutes: parsed.total_weekly_minutes ?? null,
      total_weekly_hours: parsed.total_weekly_hours ?? null,
      tasks: (parsed.categories ?? []).flatMap((c: any) => (c.tasks ?? []).map((t: any) => t.task_name)),
      source_document_id: document_id,
      parsed_at: new Date().toISOString(),
      parser_confidence: parsed.confidence ?? null,
      parser_raw: parsed,
    }).select("id").single();
    if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    for (const [i, cat] of (parsed.categories ?? []).entries()) {
      const { data: catRow, error: cErr } = await sb.from("care_plan_categories").insert({
        care_plan_id: plan.id,
        category_name: cat.category_name,
        category_code: cat.category_code ?? null,
        weekly_hours_approved: cat.weekly_hours_approved ?? 0,
        weekly_minutes_approved: cat.weekly_minutes_approved ?? 0,
        sort_order: i,
      }).select("id").single();
      if (cErr) continue;
      const taskRows = (cat.tasks ?? []).map((t: any, j: number) => ({
        care_plan_id: plan.id,
        category_id: catRow.id,
        task_name: t.task_name,
        minutes_per_task: t.minutes_per_task ?? 0,
        frequency_per_week: t.frequency_per_week ?? 0,
        minutes_per_week: t.minutes_per_week ?? ((t.minutes_per_task ?? 0) * (t.frequency_per_week ?? 0)),
        notes: t.notes ?? null,
        sort_order: j,
      }));
      if (taskRows.length) await sb.from("care_plan_tasks").insert(taskRows);
    }

    return new Response(JSON.stringify({ care_plan_id: plan.id, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
