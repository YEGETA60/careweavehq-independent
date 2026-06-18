import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { course_id, score } = await req.json();
    if (!course_id || typeof score !== "number") {
      return new Response(JSON.stringify({ error: "course_id and score required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(url, service);
    const { data: course } = await admin.from("learning_courses").select("title, passing_score").eq("id", course_id).single();
    if (!course) return new Response(JSON.stringify({ error: "Course not found" }), { status: 404, headers: corsHeaders });
    if (score < (course.passing_score ?? 80)) {
      return new Response(JSON.stringify({ error: "Score below passing" }), { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).single();
    const learnerName = profile?.full_name ?? user.email ?? "Learner";
    const certNo = `CWHQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const issuedAt = new Date();

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setDrawColor(20, 80, 140); doc.setLineWidth(6);
    doc.rect(24, 24, W - 48, H - 48);
    doc.setLineWidth(1); doc.rect(36, 36, W - 72, H - 72);

    doc.setFont("helvetica", "bold"); doc.setFontSize(34); doc.setTextColor(20, 80, 140);
    doc.text("Certificate of Completion", W / 2, 130, { align: "center" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(60, 60, 60);
    doc.text("This certifies that", W / 2, 180, { align: "center" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.setTextColor(20, 20, 20);
    doc.text(learnerName, W / 2, 230, { align: "center" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(60, 60, 60);
    doc.text("has successfully completed the CareWeaveHQ course", W / 2, 270, { align: "center" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(20, 80, 140);
    doc.text(course.title, W / 2, 320, { align: "center" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(80, 80, 80);
    doc.text(`Score: ${score}%   ·   Issued: ${issuedAt.toLocaleDateString()}`, W / 2, 360, { align: "center" });
    doc.text(`Certificate No: ${certNo}`, W / 2, 380, { align: "center" });

    doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text(
      "This certificate is general professional development and is not, by itself, a state-issued license or certification.",
      W / 2, H - 60, { align: "center" }
    );
    doc.text("CareWeaveHQ Learning Library  ·  careweavehq.com", W / 2, H - 44, { align: "center" });

    const pdfBytes = doc.output("arraybuffer");
    const path = `${user.id}/${certNo}.pdf`;
    const { error: upErr } = await admin.storage.from("certificates")
      .upload(path, new Uint8Array(pdfBytes), { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    await admin.from("learning_certificates").insert({
      user_id: user.id, course_id, certificate_no: certNo,
      score, learner_name: learnerName, course_title: course.title, storage_path: path,
    });

    const { data: signed } = await admin.storage.from("certificates").createSignedUrl(path, 60 * 60 * 24 * 7);
    return new Response(JSON.stringify({ ok: true, certificate_no: certNo, url: signed?.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});