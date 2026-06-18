import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, ShieldAlert, Eraser, Send } from "lucide-react";
import { toast } from "sonner";
import {
  detectPhi,
  redactPhi,
  summarizeMatches,
  PHI_ACK_TEXT,
  PHI_ACK_VERSION,
} from "@/lib/phi-redaction";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import { Sparkles, BookOpen } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

const CATEGORIES = ["general", "billing", "evv", "scheduling", "account", "bug", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

// Topics that require Enterprise-tier support. Standard/Professional are routed to docs.
const ENTERPRISE_ONLY_CATEGORIES = new Set(["billing"]);
const ENTERPRISE_KEYWORDS = [
  "clearinghouse", "837", "837p", "835", "remittance", "denial", "denials",
  "emar", "e-mar", "medication", "rcm", "revenue cycle",
  "270", "271", "276", "277", "eligibility check", "claim status",
  "hhaexchange", "aggregator",
];

export function Support() {
  const { user } = useAuth();
  const { tierSlug } = useSubscription();
  const isEnterprise = tierSlug === "enterprise";
  const isStandard = !tierSlug || tierSlug === "standard";
  const [hasAck, setHasAck] = useState<boolean | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [docsConfirmed, setDocsConfirmed] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");

  const subjectMatches = useMemo(() => detectPhi(subject), [subject]);
  const bodyMatches = useMemo(() => detectPhi(body), [body]);
  const allMatches = [...subjectMatches, ...bodyMatches];
  const hasPhi = allMatches.length > 0;

  const enterpriseTopicDetected = useMemo(() => {
    if (isEnterprise) return false;
    if (ENTERPRISE_ONLY_CATEGORIES.has(category)) return true;
    const blob = `${subject} ${body}`.toLowerCase();
    return ENTERPRISE_KEYWORDS.some((kw) => blob.includes(kw));
  }, [isEnterprise, category, subject, body]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("phi_acknowledgements")
        .select("id")
        .eq("user_id", user.id)
        .eq("context", "support")
        .eq("version", PHI_ACK_VERSION)
        .limit(1);
      setHasAck((data ?? []).length > 0);
    })();
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id,subject,body,category,priority,status,created_at")
      .order("created_at", { ascending: false });
    if (!error) setTickets((data ?? []) as Ticket[]);
  };

  const acknowledge = async () => {
    if (!user?.id || !ackChecked) return;
    setLoading(true);
    const { error } = await supabase.from("phi_acknowledgements").insert({
      user_id: user.id,
      version: PHI_ACK_VERSION,
      context: "support",
      user_agent: navigator.userAgent.slice(0, 500),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setHasAck(true);
    toast.success("PHI acknowledgement recorded");
  };

  const handleRedact = () => {
    setSubject((s) => redactPhi(s).redacted);
    setBody((b) => redactPhi(b).redacted);
    toast.info("PHI patterns replaced with [REDACTED] markers — review before sending.");
  };

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    if (hasPhi) {
      toast.error("Remove or redact PHI before submitting.");
      return;
    }
    if (!user?.id) return;
    setLoading(true);
    // Get latest ack id for audit linkage
    const { data: ackRows } = await supabase
      .from("phi_acknowledgements")
      .select("id")
      .eq("user_id", user.id)
      .eq("context", "support")
      .order("acknowledged_at", { ascending: false })
      .limit(1);
    const ackId = ackRows?.[0]?.id ?? null;

    const { error } = await supabase.from("support_tickets").insert({
      subject: subject.trim(),
      body: body.trim(),
      category,
      priority,
      created_by: user.id,
      phi_ack_id: ackId,
      redaction_meta: {
        client_scan_clean: true,
        ack_version: PHI_ACK_VERSION,
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("PHI_BLOCKED")) {
        toast.error("Server blocked submission: PHI detected. Please remove and try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setSubject("");
    setBody("");
    setCategory("general");
    setPriority("normal");
    toast.success("Ticket submitted");
    loadTickets();
  };

  if (hasAck === null) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
          <LifeBuoy className="h-6 w-6 sm:h-8 sm:w-8" /> Support
        </h2>
        <p className="text-muted-foreground mt-1">
          Open and track support tickets. PHI is not permitted in general support.
        </p>
      </div>

      <LegalDisclaimer variant="noPHIInSupport" />

      {/* Tier-aware SLA banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-medium">
              Your support SLA:{" "}
              {isEnterprise
                ? "4-hour priority response + clearinghouse / 837P / eMAR troubleshooting."
                : tierSlug === "professional"
                ? "24-hour email + chat. Clearinghouse / 837P / eMAR help is Enterprise-only."
                : "48-hour email after self-serve. Clearinghouse / 837P / eMAR help is Enterprise-only."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start with the docs and in-product AI — most questions are answered there.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/docs"><BookOpen className="h-3.5 w-3.5 mr-1" /> Docs</Link>
            </Button>
            {!isEnterprise && (
              <Button asChild size="sm">
                <Link to="/pricing"><Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasAck ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-5 w-5" /> PHI handling acknowledgement required
            </CardTitle>
            <CardDescription>
              You must acknowledge our PHI handling policy before opening a support ticket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              {PHI_ACK_TEXT}
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={ackChecked}
                onCheckedChange={(v) => setAckChecked(v === true)}
                className="mt-0.5"
              />
              <span>
                I have read and agree to the PHI handling acknowledgement (version{" "}
                {PHI_ACK_VERSION}).
              </span>
            </label>
            <Button onClick={acknowledge} disabled={!ackChecked || loading}>
              Acknowledge & continue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Open a new ticket</CardTitle>
            <CardDescription>
              Describe the issue without naming clients or including dates of birth, SSNs, MRNs,
              or diagnoses. Our system will block submissions containing PHI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="body">Description</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Describe the issue. Reference clients by internal ID only — never by name, DOB, or SSN."
                  maxLength={5000}
                />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasPhi && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold">PHI detected — submission blocked</p>
                    <p className="text-xs mt-0.5 text-destructive/90">
                      Detected: {summarizeMatches(allMatches)}. Remove this content or click
                      Auto-redact below before submitting.
                    </p>
                  </div>
                </div>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRedact}
                    className="gap-1"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Auto-redact PHI patterns
                  </Button>
                </div>
              </div>
            )}

            {enterpriseTopicDetected && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold">Looks like an Enterprise-tier topic</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      Clearinghouse, 837P/835, eMAR, RCM, and state-aggregator troubleshooting
                      are part of Enterprise support. On {tierSlug ?? "your current plan"},
                      we'll route you to documentation instead of opening a hands-on ticket.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/docs"><BookOpen className="h-3.5 w-3.5 mr-1" /> Read docs</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/pricing"><Sparkles className="h-3.5 w-3.5 mr-1" /> Upgrade to Enterprise</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Standard tier: require self-serve confirmation before ticket submission */}
            {isStandard && !enterpriseTopicDetected && (
              <label className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm cursor-pointer">
                <Checkbox
                  checked={docsConfirmed}
                  onCheckedChange={(v) => setDocsConfirmed(v === true)}
                  className="mt-0.5"
                />
                <span className="text-amber-900 dark:text-amber-200">
                  I've checked the{" "}
                  <Link to="/docs" className="underline font-medium">documentation</Link>{" "}
                  and the in-product AI assistant first. (Required on Standard — most questions
                  are answered in docs.)
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={submit}
                disabled={
                  loading ||
                  hasPhi ||
                  enterpriseTopicDetected ||
                  (isStandard && !docsConfirmed) ||
                  !subject.trim() ||
                  !body.trim()
                }
              >
                <Send className="h-4 w-4 mr-1" />
                {isEnterprise ? "Contact specialist" : "Submit ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLA disclosure footer */}
      <p className="text-xs text-muted-foreground border-t pt-4">
        <span className="font-medium text-foreground">SLA Support:</span>{" "}
        Standard (Docs + Community + 48h email); Professional (24h email);
        Enterprise (4h priority + clearinghouse troubleshooting).
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Your tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <ul className="divide-y">
              {tickets.map((t) => (
                <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(t.created_at).toLocaleString()} · {t.category}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="outline">{t.priority}</Badge>
                    <Badge>{t.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Support;