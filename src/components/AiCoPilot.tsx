import { useEffect, useState } from "react";
import { Sparkles, Loader2, Users, AlertCircle, MessageSquare, Compass, Check, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TOURS, getTour } from "@/components/copilot/tours";
import { useGuideProgress } from "@/components/copilot/useGuideProgress";
import { usePersonalization } from "@/components/copilot/usePersonalization";
import { PersonalizeDialog } from "@/components/copilot/PersonalizeDialog";
import { ROLE_LABELS, GOAL_LABELS } from "@/components/copilot/personalization";

type Tab = "menu" | "explain" | "draft" | "shift" | "guide" | "guide-ask";

export function AiCoPilot() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("menu");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [draftContext, setDraftContext] = useState("");
  const [draftAudience, setDraftAudience] = useState<"family" | "caregiver" | "client">("family");
  const { isModuleUnlocked, tierName } = useSubscription();
  const { hasRole } = useAuth();
  const unlocked = isModuleUnlocked("ai-copilot") || hasRole("superadmin");
  const { state, startTour } = useGuideProgress();
  const { profile, path, data, saveProfile, reset } = usePersonalization();
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  useEffect(() => {
    const handler = () => { setOpen(true); setPersonalizeOpen(true); };
    window.addEventListener("cw:open-copilot-personalize", handler);
    return () => window.removeEventListener("cw:open-copilot-personalize", handler);
  }, []);
  const [askText, setAskText] = useState("");
  const [askResult, setAskResult] = useState<{ tour?: string; hint?: string; module?: string } | null>(null);

  const run = async (action: "explain_roster" | "draft_message", payload: Record<string, unknown> = {}) => {
    setLoading(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-copilot", {
        body: { action, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data?.text ?? "");
    } catch (e: any) {
      const msg = e?.message ?? "Co-Pilot request failed";
      toast.error(msg);
      setOutput("");
    } finally {
      setLoading(false);
    }
  };

  const back = () => { setTab("menu"); setOutput(""); };

  const launchTour = (id: string) => {
    startTour(id);
    setOpen(false);
  };

  const askGuide = async () => {
    if (!askText.trim()) return;
    setLoading(true);
    setAskResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-copilot", {
        body: { action: "suggest_guide", question: askText, tours: TOURS.map((t) => ({ id: t.id, title: t.title, description: t.description })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAskResult(data ?? null);
      if (data?.tour && TOURS.some((t) => t.id === data.tour)) {
        launchTour(data.tour);
      } else if (data?.module) {
        window.dispatchEvent(new CustomEvent("cw:navigate", { detail: data.module }));
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not get guidance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) back(); }}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-primary/30 bg-primary/5 hover:bg-primary/10"
          aria-label="Open AI Co-Pilot"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">AI Co-Pilot</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <PersonalizeDialog
          open={personalizeOpen}
          onOpenChange={setPersonalizeOpen}
          initial={profile}
          onSave={(p) => {
            saveProfile(p);
            setTab("guide");
            toast.success("Walkthrough personalized to your role & goals.");
          }}
        />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Co-Pilot
            {!unlocked && <Badge variant="secondary" className="ml-auto text-[10px]">Pro</Badge>}
          </SheetTitle>
          <SheetDescription>
            Ask about today's roster, draft messages, or get scheduling suggestions — powered by Lovable AI.
          </SheetDescription>
        </SheetHeader>

        {!unlocked ? (
          <Card className="mt-6 p-5 space-y-3 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Available on the Pro plan</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              You're on the {tierName ?? "current"} plan. Upgrade to Pro to unlock the AI Co-Pilot —
              explain today's lateness in plain English, draft family messages, and rank caregivers for open shifts.
            </p>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>Explain late / absent visits today</li>
              <li>Draft client &amp; family messages</li>
              <li>AI shift matcher for open shifts</li>
            </ul>
          </Card>
        ) : (
          <div className="mt-4 flex-1 overflow-y-auto space-y-3">
            {tab === "menu" && (
              <>
                <CopilotAction
                  icon={<Compass className="h-4 w-4 text-primary" />}
                  title="Guide me through a task"
                  desc="Step-by-step coach marks for client, caregiver, scheduling & billing."
                  onClick={() => setTab("guide")}
                />
                <CopilotAction
                  icon={<UserCog className="h-4 w-4 text-primary" />}
                  title={profile ? "Update my personalized path" : "Personalize my walkthrough"}
                  desc={
                    profile
                      ? `Tailored for ${ROLE_LABELS[profile.role]} • ${profile.goals.length} goal${profile.goals.length === 1 ? "" : "s"}`
                      : "Tell Co-Pilot your role & goals so it can recommend the right tour first."
                  }
                  onClick={() => setPersonalizeOpen(true)}
                />
                <CopilotAction
                  icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
                  title="Why is anyone late today?"
                  desc="Analyzes today's roster and EVV clock-ins."
                  onClick={() => { setTab("explain"); run("explain_roster"); }}
                />
                <CopilotAction
                  icon={<MessageSquare className="h-4 w-4 text-primary" />}
                  title="Draft a client / family message"
                  desc="Generates a short, professional message you can copy."
                  onClick={() => setTab("draft")}
                />
                <CopilotAction
                  icon={<Users className="h-4 w-4 text-emerald-600" />}
                  title="Suggest a caregiver for a shift"
                  desc="Opens Scheduling Intel where you can pick an open shift."
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent("cw:navigate", { detail: "schedintel" }));
                  }}
                />
                <p className="text-[11px] text-muted-foreground pt-2 px-1">
                  Co-Pilot reads your roster but never writes back to the database.
                </p>
              </>
            )}

            {tab === "guide" && (
              <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={back}>← Back</Button>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">Recommended for you</h4>
                  <button
                    onClick={() => setPersonalizeOpen(true)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {profile ? "Edit profile" : "Personalize"}
                  </button>
                </div>
                {profile ? (
                  <div className="text-[11px] text-muted-foreground -mt-1 mb-1">
                    {ROLE_LABELS[profile.role]} · goals: {profile.goals.map((g) => GOAL_LABELS[g]).join(", ")}
                    {" · "}
                    <button onClick={reset} className="underline hover:text-foreground">reset</button>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground -mt-1 mb-1">
                    Showing the default order. <button onClick={() => setPersonalizeOpen(true)} className="text-primary underline">Personalize</button> to reorder.
                  </div>
                )}
                <div className="space-y-2">
                  {path.map((rec, idx) => {
                    const t = getTour(rec.tourId);
                    if (!t) return null;
                    const ts = state.tours[t.id];
                    const done = !!ts?.completedAt;
                    const total = t.steps.length;
                    const completed = ts?.completedSteps.length ?? 0;
                    const Icon = t.icon;
                    const isTop = idx === 0;
                    return (
                      <button
                        key={t.id}
                        onClick={() => launchTour(t.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isTop
                            ? "border-primary/60 bg-primary/5 hover:bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5"><Icon className="h-4 w-4 text-primary" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-sm flex items-center gap-1.5">
                                {t.title}
                                {isTop && !done && (
                                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                                    Start here
                                  </span>
                                )}
                              </div>
                              {done ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600"><Check className="h-3 w-3" />Done</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                            <div className="text-[11px] text-primary/80 mt-1 italic">{rec.reason}</div>
                            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground pt-1 px-1">
                  Based on your data: {data.clients} clients · {data.caregivers} caregivers · {data.visits} visits · {data.invoices} invoices.
                </div>
                <button
                  onClick={() => setTab("guide-ask")}
                  className="w-full text-left p-3 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Guide me through something else</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Describe a task in your own words — Co-Pilot picks the closest flow.</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {tab === "guide-ask" && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" onClick={() => setTab("guide")}>← Back</Button>
                <h4 className="font-semibold text-sm">What do you want to do?</h4>
                <Textarea
                  rows={3}
                  placeholder="e.g. 'How do I add a payer authorization?' or 'Where do I see expiring credentials?'"
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                />
                <Button size="sm" disabled={loading || !askText.trim()} onClick={askGuide}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Get guidance
                </Button>
                {askResult?.hint && (
                  <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap leading-relaxed">{askResult.hint}</div>
                )}
              </div>
            )}

            {tab === "explain" && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" onClick={back}>← Back</Button>
                <h4 className="font-semibold text-sm">Today's roster analysis</h4>
                <OutputBox loading={loading} output={output} />
                <Button variant="outline" size="sm" onClick={() => run("explain_roster")} disabled={loading}>
                  Re-analyze
                </Button>
              </div>
            )}

            {tab === "draft" && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" onClick={back}>← Back</Button>
                <h4 className="font-semibold text-sm">Draft a message</h4>
                <div className="flex gap-1.5 text-xs">
                  {(["family", "caregiver", "client"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setDraftAudience(a)}
                      className={`px-2.5 py-1 rounded-full border ${
                        draftAudience === a ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  placeholder="What's the message about? e.g. 'Caregiver swap for tomorrow's morning shift'"
                  value={draftContext}
                  onChange={(e) => setDraftContext(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={loading || !draftContext.trim()}
                  onClick={() => run("draft_message", { audience: draftAudience, context: draftContext })}
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate draft
                </Button>
                <OutputBox loading={loading} output={output} />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CopilotAction({
  icon, title, desc, onClick,
}: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function OutputBox({ loading, output }: { loading: boolean; output: string }) {
  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
      </div>
    );
  }
  if (!output) return null;
  return (
    <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap leading-relaxed">
      {output}
    </div>
  );
}