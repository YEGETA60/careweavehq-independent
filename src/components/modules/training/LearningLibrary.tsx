import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Award, Sparkles, ChevronLeft, CheckCircle2, Download } from "lucide-react";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { STARTER_CURRICULUM } from "./curriculum";

type Course = {
  id: string; slug: string; title: string; summary: string | null;
  role_tags: string[]; category: string; level: string;
  estimated_minutes: number; cover_emoji: string | null; passing_score: number;
};
type Lesson = { id: string; course_id: string; slug: string; title: string; body_md: string; sort_order: number; est_minutes: number };
type Quiz = { id: string; lesson_id: string; question: string; options: string[]; explanation: string | null; sort_order: number };
type Enrollment = { id: string; course_id: string; completed_at: string | null; best_score: number | null; attempts: number };
type Progress = { lesson_id: string; course_id: string };
type Certificate = { id: string; course_id: string; course_title: string; certificate_no: string; score: number; issued_at: string; storage_path: string | null };

export function LearningLibrary() {
  const { user, hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(["admin", "superadmin"]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, e, p, cert] = await Promise.all([
      (supabase as any).from("learning_courses").select("*").eq("published", true).order("sort_order"),
      user ? (supabase as any).from("learning_enrollments").select("*").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      user ? (supabase as any).from("learning_lesson_progress").select("lesson_id, course_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      user ? (supabase as any).from("learning_certificates").select("*").eq("user_id", user.id).order("issued_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    setCourses(c.data ?? []);
    setEnrollments(e.data ?? []);
    setProgress(p.data ?? []);
    setCertificates(cert.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter(c => {
      if (roleFilter !== "all" && !c.role_tags.includes(roleFilter)) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || (c.summary ?? "").toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    });
  }, [courses, search, roleFilter]);

  const lessonsByCourse = (courseId: string) =>
    progress.filter(p => p.course_id === courseId).length;

  const seedLibrary = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("learning-seed-library", {
        body: { courses: STARTER_CURRICULUM },
      });
      if (error) throw error;
      toast.success(`Seeded ${(data as any).coursesUpserted} courses, ${(data as any).lessonsUpserted} lessons`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const downloadCert = async (cert: Certificate) => {
    if (!cert.storage_path) return;
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(cert.storage_path, 60 * 10);
    if (error || !data?.signedUrl) return toast.error("Could not open certificate");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = `${cert.certificate_no}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (activeCourse) {
    return <CourseView course={activeCourse} onBack={() => { setActiveCourse(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <LegalDisclaimer
        variant="custom"
        message="The Learning Library provides general best-practice education. It is not a substitute for state-required certification, your agency's policies, or clinical/legal advice."
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="caregiver">Caregiver</SelectItem>
            <SelectItem value="nurse">Nurse</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={seedLibrary} disabled={seeding}>
            <Sparkles className="h-4 w-4 mr-1" /> {seeding ? "Seeding…" : "Seed starter library"}
          </Button>
        )}
      </div>

      {certificates.length > 0 && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> My Certificates</CardTitle></CardHeader>
          <CardContent className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {certificates.map(c => (
              <button key={c.id} onClick={() => downloadCert(c)} className="text-left rounded-md border p-3 hover:bg-accent transition">
                <div className="text-sm font-medium">{c.course_title}</div>
                <div className="text-xs text-muted-foreground">#{c.certificate_no} · Score {c.score}% · {new Date(c.issued_at).toLocaleDateString()}</div>
                <div className="text-xs text-primary mt-1 flex items-center gap-1"><Download className="h-3 w-3" /> Download PDF</div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading library…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground space-y-2">
          <BookOpen className="h-8 w-8 mx-auto opacity-60" />
          <p>No courses yet.</p>
          {isAdmin && <p className="text-xs">Click "Seed starter library" to install the starter curriculum.</p>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(c => {
            const en = enrollments.find(e => e.course_id === c.id);
            const done = lessonsByCourse(c.id);
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setActiveCourse(c)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{c.cover_emoji ?? "📘"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{c.summary}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.level}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.estimated_minutes} min</Badge>
                    {c.role_tags.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                  </div>
                  {en?.completed_at ? (
                    <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed · {en.best_score}%</div>
                  ) : done > 0 ? (
                    <div className="text-xs text-muted-foreground">{done} lesson{done > 1 ? "s" : ""} done</div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseView({ course, onBack }: { course: Course; onBack: () => void }) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [l, q, p] = await Promise.all([
      (supabase as any).from("learning_lessons").select("*").eq("course_id", course.id).order("sort_order"),
      (supabase as any).from("learning_quizzes").select("id,lesson_id,course_id,question,options,explanation,sort_order").eq("course_id", course.id).order("sort_order"),
      user ? (supabase as any).from("learning_lesson_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", course.id) : Promise.resolve({ data: [] }),
    ]);
    setLessons(l.data ?? []);
    setQuizzes(q.data ?? []);
    setProgress(new Set((p.data ?? []).map((r: any) => r.lesson_id)));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [course.id, user?.id]);

  const markComplete = async (lesson: Lesson) => {
    if (!user) return;
    await (supabase as any).from("learning_enrollments").upsert(
      { user_id: user.id, course_id: course.id, started_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" }
    );
    const { error } = await (supabase as any).from("learning_lesson_progress").insert({
      user_id: user.id, lesson_id: lesson.id, course_id: course.id,
    });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    setProgress(prev => new Set(prev).add(lesson.id));
    toast.success("Lesson complete");
  };

  const submitQuiz = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Grade server-side so quiz answer keys are never exposed to the client.
      const { data: graded, error: gradeErr } = await supabase.functions.invoke("learning-grade-quiz", {
        body: { course_id: course.id, answers },
      });
      if (gradeErr || !graded) {
        setSubmitting(false);
        return toast.error("Grading failed: " + (gradeErr?.message ?? "unknown error"));
      }
      const score = (graded as any).score as number;
      const passed = (graded as any).passed as boolean;

      await (supabase as any).from("learning_enrollments").upsert(
        {
          user_id: user.id, course_id: course.id,
          completed_at: passed ? new Date().toISOString() : null,
          last_score: score,
          best_score: score,
          attempts: 1,
        },
        { onConflict: "user_id,course_id" }
      );

      if (passed) {
        toast.success(`Passed! ${score}% — issuing certificate…`);
        const { data, error } = await supabase.functions.invoke("learning-issue-certificate", {
          body: { course_id: course.id, score },
        });
        if (error) toast.error("Certificate failed: " + error.message);
        else if ((data as any)?.url) {
          const a = document.createElement("a");
          a.href = (data as any).url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.download = `${(data as any).certificate_no ?? "certificate"}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else {
        toast.error(`Score ${score}% — passing score is ${course.passing_score}%. Try again.`);
      }
      setQuizOpen(false);
      setAnswers({});
    } finally {
      setSubmitting(false);
    }
  };

  const allLessonsDone = lessons.length > 0 && lessons.every(l => progress.has(l.id));
  const pct = lessons.length ? Math.round((progress.size / lessons.length) * 100) : 0;

  if (activeLesson) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to {course.title}
        </Button>
        <Card><CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-1">{activeLesson.title}</h1>
          <p className="text-xs text-muted-foreground mb-4">{activeLesson.est_minutes} min · {course.title}</p>
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {activeLesson.body_md}
            </ReactMarkdown>
          </article>
          <div className="mt-6 pt-4 border-t flex justify-end">
            {progress.has(activeLesson.id) ? (
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
            ) : (
              <Button onClick={() => markComplete(activeLesson)}>Mark complete</Button>
            )}
          </div>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back to library</Button>
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="text-4xl">{course.cover_emoji ?? "📘"}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{course.title}</h2>
            <p className="text-sm text-muted-foreground">{course.summary}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>
              <Badge variant="outline" className="text-[10px]">{course.estimated_minutes} min</Badge>
              {course.role_tags.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.size} / {lessons.length} lessons</span><span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
      </CardContent></Card>

      <div className="space-y-2">
        {lessons.map((l, i) => (
          <Card key={l.id} className="cursor-pointer hover:bg-accent/40 transition" onClick={() => setActiveLesson(l)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">{i + 1}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.est_minutes} min</div>
              </div>
              {progress.has(l.id) && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {quizzes.length > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Final Quiz · {quizzes.length} questions</div>
              <div className="text-xs text-muted-foreground">Passing score {course.passing_score}% earns a certificate.</div>
            </div>
            <Button disabled={!allLessonsDone} onClick={() => setQuizOpen(true)}>
              {allLessonsDone ? "Take quiz" : "Finish lessons first"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{course.title} · Quiz</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {quizzes.map((q, qi) => (
              <div key={q.id} className="space-y-2">
                <div className="text-sm font-medium">{qi + 1}. {q.question}</div>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted">
                      <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers(a => ({ ...a, [q.id]: oi }))} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setQuizOpen(false)}>Cancel</Button>
              <Button onClick={submitQuiz} disabled={submitting || Object.keys(answers).length < quizzes.length}>
                {submitting ? "Grading…" : "Submit quiz"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}