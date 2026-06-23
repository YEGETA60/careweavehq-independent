import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createChatCompletion, hasAIProvider } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin } = await supa.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "forbidden — admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { section_id, change_summary, mode } = body as {
      section_id?: string;
      change_summary?: string;
      mode?: "revise" | "create";
    };
    if (!section_id && mode !== "create") return json({ error: "section_id required" }, 400);
    if (!change_summary || change_summary.length < 5)
      return json({ error: "change_summary must describe what changed" }, 400);

    let title = "";
    let currentBody = "";
    let module_key: string | null = null;
    let role_tags: string[] = [];
    if (section_id) {
      const { data: section, error } = await supa
        .from("manual_sections")
        .select("title,body,module_key,role_tags")
        .eq("id", section_id)
        .maybeSingle();
      if (error || !section) return json({ error: "section not found" }, 404);
      title = section.title;
      currentBody = section.body;
      module_key = section.module_key;
      role_tags = section.role_tags ?? [];
    }

    if (!hasAIProvider()) return json({ error: "AI provider is not configured" }, 500);

    const system = `You are a senior technical writer for a U.S. home care operations platform called CareWeave.
You rewrite Operations Manual sections in clear, friendly markdown.
Rules:
- Output ONLY the new markdown body (no preamble, no fenced code wrapper).
- Keep the heading hierarchy starting at # for the section title.
- Use short paragraphs, bullet lists, and numbered steps.
- Preserve any compliance-critical wording (EVV verification, paid-invoice immutability, override audit trails).
- Never invent features. If the change describes new behavior, integrate it; otherwise keep existing accurate content.
- Aim for 150–500 words.`;

    const userMsg = `Section title: ${title || "(new section)"}
Module key: ${module_key ?? "(none)"}
Audience roles: ${role_tags.join(", ") || "all"}

Current body:
"""
${currentBody || "(empty — draft from scratch)"}
"""

Requested change / new info to incorporate:
"""
${change_summary}
"""

Rewrite the section body now.`;

    const aiRes = await createChatCompletion(
      {
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        temperature: 0.4,
      },
      {
        lovableModel: "google/gemini-2.5-flash",
        directModel: "gpt-4.1-mini",
        modelEnv: "AI_MANUAL_MODEL",
      },
    );

    if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
    if (aiRes.status === 402) return json({ error: "ai_credits_exhausted" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "ai_error", detail: t.slice(0, 500) }, 502);
    }

    const data = await aiRes.json();
    const draft = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!draft) return json({ error: "empty_draft" }, 502);

    return json({ draft });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
