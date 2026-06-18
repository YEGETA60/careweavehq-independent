import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { course_id, answers } = await req.json();
    if (!course_id || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "bad_request" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: course } = await admin
      .from("learning_courses")
      .select("id, passing_score, published")
      .eq("id", course_id)
      .maybeSingle();
    if (!course) {
      return new Response(JSON.stringify({ error: "course_not_found" }), {
        status: 404, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { data: quizzes } = await admin
      .from("learning_quizzes")
      .select("id, correct_index")
      .eq("course_id", course_id);

    const total = quizzes?.length ?? 0;
    let correct = 0;
    for (const q of quizzes ?? []) {
      if (answers[q.id] === q.correct_index) correct++;
    }
    const score = Math.round((correct / Math.max(1, total)) * 100);
    const passing = course.passing_score ?? 80;
    const passed = score >= passing;

    return new Response(JSON.stringify({ score, passed, total, correct }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});