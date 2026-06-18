import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Quiz = { question: string; options: string[]; correct_index: number; explanation?: string };
type Lesson = { slug: string; title: string; body_md: string; est_minutes?: number; quizzes?: Quiz[] };
type Course = {
  slug: string; title: string; summary: string; role_tags: string[];
  category: string; level: string; estimated_minutes: number;
  cover_emoji?: string; sort_order: number; lessons: Lesson[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(url, service);
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: corsHeaders });
    }

    const { courses } = (await req.json()) as { courses: Course[] };
    if (!Array.isArray(courses) || courses.length === 0) {
      return new Response(JSON.stringify({ error: "courses required" }), { status: 400, headers: corsHeaders });
    }

    let coursesUpserted = 0, lessonsUpserted = 0, quizzesUpserted = 0;

    for (const c of courses) {
      const { data: courseRow, error: cErr } = await admin
        .from("learning_courses")
        .upsert({
          slug: c.slug, title: c.title, summary: c.summary, role_tags: c.role_tags,
          category: c.category, level: c.level, estimated_minutes: c.estimated_minutes,
          cover_emoji: c.cover_emoji ?? null, sort_order: c.sort_order, published: true,
        }, { onConflict: "slug" })
        .select("id")
        .single();
      if (cErr) throw cErr;
      coursesUpserted++;

      for (let i = 0; i < c.lessons.length; i++) {
        const l = c.lessons[i];
        const { data: lessonRow, error: lErr } = await admin
          .from("learning_lessons")
          .upsert({
            course_id: courseRow.id, slug: l.slug, title: l.title,
            body_md: l.body_md, sort_order: (i + 1) * 10,
            est_minutes: l.est_minutes ?? 5,
          }, { onConflict: "course_id,slug" })
          .select("id")
          .single();
        if (lErr) throw lErr;
        lessonsUpserted++;

        // Replace quizzes for this lesson to keep idempotent
        await admin.from("learning_quizzes").delete().eq("lesson_id", lessonRow.id);
        if (l.quizzes?.length) {
          const rows = l.quizzes.map((q, qi) => ({
            lesson_id: lessonRow.id,
            course_id: courseRow.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation ?? null,
            sort_order: (qi + 1) * 10,
          }));
          const { error: qErr } = await admin.from("learning_quizzes").insert(rows);
          if (qErr) throw qErr;
          quizzesUpserted += rows.length;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, coursesUpserted, lessonsUpserted, quizzesUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});