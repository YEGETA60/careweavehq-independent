import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen, Search, Sparkles, Pencil, History, Save, Printer,
  ThumbsUp, ThumbsDown, Plus, Filter,
} from "lucide-react";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

type Section = {
  id: string;
  slug: string;
  title: string;
  module_key: string | null;
  section_type: "guide" | "faq" | "runbook" | "glossary" | "overview";
  role_tags: string[];
  body: string;
  summary: string | null;
  sort_order: number;
  version: number;
  published: boolean;
  updated_at: string;
};

type Version = {
  id: string;
  version: number;
  title: string;
  body: string;
  change_summary: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<Section["section_type"], string> = {
  overview: "Overview",
  guide: "Guide",
  faq: "FAQ",
  runbook: "Runbook",
  glossary: "Glossary",
};

export function OperationsManual() {
  const { roles, hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(["admin", "superadmin"]);

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("manual_sections")
      .select("*")
      .eq("published", true)
      .order("sort_order");
    if (error) toast.error("Could not load manual: " + error.message);
    setSections(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Default role filter to user's primary role
  useEffect(() => {
    if (roleFilter === "all" && roles.length > 0) {
      const primary = roles.find(r => ["admin","manager","scheduler","billing","caregiver","family"].includes(r));
      if (primary) setRoleFilter(primary);
    }
  }, [roles]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter(s => {
      if (roleFilter !== "all" && !s.role_tags.includes(roleFilter) && s.role_tags.length > 0) return false;
      if (typeFilter !== "all" && s.section_type !== typeFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        (s.summary ?? "").toLowerCase().includes(q) ||
        (s.module_key ?? "").toLowerCase().includes(q)
      );
    });
  }, [sections, search, roleFilter, typeFilter]);

  const active = filtered.find(s => s.id === activeId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active?.id]); // eslint-disable-line

  const startEdit = () => {
    if (!active) return;
    setEditTitle(active.title);
    setEditBody(active.body);
    setChangeSummary("");
    setEditing(true);
  };

  const aiDraft = async () => {
    if (!active) return;
    if (!changeSummary.trim()) {
      toast.error("Describe what changed so the AI can revise the section");
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("manual-ai-draft", {
        body: { section_id: active.id, change_summary: changeSummary },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setEditBody((data as any).draft);
      toast.success("AI draft loaded — review and save");
    } catch (e: any) {
      toast.error(e.message || "AI draft failed");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    if (!active) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("manual_sections")
      .update({
        title: editTitle,
        body: editBody,
        updated_by: u.user?.id,
      })
      .eq("id", active.id);
    if (error) return toast.error("Save failed: " + error.message);

    // Attach change_summary to the version row that was just snapshotted
    if (changeSummary.trim()) {
      await (supabase as any)
        .from("manual_versions")
        .update({ change_summary: changeSummary })
        .eq("section_id", active.id)
        .eq("version", active.version);
    }
    toast.success("Section updated");
    setEditing(false);
    load();
  };

  const openHistory = async () => {
    if (!active) return;
    const { data } = await (supabase as any)
      .from("manual_versions")
      .select("*")
      .eq("section_id", active.id)
      .order("version", { ascending: false });
    setVersions(data ?? []);
    setShowHistory(true);
  };

  const submitFeedback = async (helpful: boolean) => {
    if (!active) return;
    const { data: u } = await supabase.auth.getUser();
    await (supabase as any).from("manual_feedback").insert({
      section_id: active.id,
      user_id: u.user?.id,
      helpful,
    });
    toast.success("Thanks for the feedback");
  };

  const printPdf = () => window.print();

  const createNew = async (vals: { title: string; slug: string; section_type: Section["section_type"]; module_key: string; role_tags: string }) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("manual_sections").insert({
      title: vals.title,
      slug: vals.slug || vals.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      section_type: vals.section_type,
      module_key: vals.module_key || null,
      role_tags: vals.role_tags.split(",").map(s => s.trim()).filter(Boolean),
      body: `# ${vals.title}\n\n_Draft this section._`,
      sort_order: 500,
      updated_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Section created");
    setShowNew(false);
    load();
  };

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Operations Manual</h1>
          <Badge variant="secondary">v{Math.max(1, ...sections.map(s => s.version))}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New section
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={printPdf}>
            <Printer className="h-4 w-4 mr-1" /> PDF / Print
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <LegalDisclaimer
          variant="custom"
          message="The Operations Manual contains general operating guidance and may include AI-assisted drafts. It is not legal, tax, or compliance advice. Verify procedures against your state-specific Medicare, Medicaid, EVV, and labor regulations and your agency's policies before acting."
        />
      </div>

      <Card className="print:hidden">
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search the manual…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="scheduler">Scheduler</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="guide">Guides</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="runbook">Runbooks</SelectItem>
                <SelectItem value="glossary">Glossary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 print:block">
        <Card className="print:hidden">
          <CardHeader className="py-3"><CardTitle className="text-sm">Contents ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh]">
              <ul className="divide-y">
                {loading && <li className="p-3 text-sm text-muted-foreground">Loading…</li>}
                {!loading && filtered.length === 0 && (
                  <li className="p-3 text-sm text-muted-foreground">No sections match your filters.</li>
                )}
                {filtered.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => { setActiveId(s.id); setEditing(false); }}
                      className={`w-full text-left p-3 hover:bg-accent transition-colors ${active?.id === s.id ? "bg-accent" : ""}`}
                    >
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[s.section_type]}</Badge>
                        {s.module_key && <span className="text-[10px] text-muted-foreground">{s.module_key}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-0">
          {!active ? (
            <CardContent className="p-8 text-center text-muted-foreground">Select a section.</CardContent>
          ) : editing ? (
            <CardContent className="p-4 space-y-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-bold" />
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI-assisted update
                </div>
                <Textarea
                  placeholder="Describe what changed (e.g. 'New EVV reconciliation rule: variance threshold reduced from 15 to 10 minutes')"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  rows={2}
                />
                <Button size="sm" onClick={aiDraft} disabled={aiBusy}>
                  {aiBusy ? "Drafting…" : "Draft with AI"}
                </Button>
              </div>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save & publish</Button>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-6 print:p-0">
              <div className="flex items-start justify-between gap-2 mb-4 print:mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{TYPE_LABEL[active.section_type]}</Badge>
                    {active.module_key && <Badge variant="outline">{active.module_key}</Badge>}
                    {active.role_tags.map(r => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    v{active.version} · last updated {new Date(active.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 print:hidden">
                  <Button variant="ghost" size="sm" onClick={openHistory}>
                    <History className="h-4 w-4 mr-1" /> History
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              <article className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.body}</ReactMarkdown>
              </article>

              <div className="mt-8 pt-4 border-t flex items-center justify-between print:hidden">
                <div className="text-sm text-muted-foreground">Was this section helpful?</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => submitFeedback(true)}>
                    <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => submitFeedback(false)}>
                    <ThumbsDown className="h-4 w-4 mr-1" /> No
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Print-only: render every filtered section sequentially for full-PDF export */}
      <div className="hidden print:block space-y-8">
        {filtered.map(s => (
          <article key={s.id} className="prose prose-slate max-w-none break-after-page">
            <h1>{s.title}</h1>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABEL[s.section_type]} · v{s.version} · {new Date(s.updated_at).toLocaleDateString()}
            </p>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body}</ReactMarkdown>
          </article>
        ))}
      </div>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Version history — {active?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {versions.length === 0 && <p className="text-sm text-muted-foreground">No prior versions.</p>}
              {versions.map(v => (
                <div key={v.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">v{v.version}</div>
                    <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
                  </div>
                  {v.change_summary && (
                    <p className="text-xs italic text-muted-foreground mt-1">{v.change_summary}</p>
                  )}
                  <pre className="text-xs whitespace-pre-wrap mt-2 max-h-40 overflow-auto">{v.body}</pre>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <NewSectionDialog open={showNew} onOpenChange={setShowNew} onCreate={createNew} />
    </div>
  );
}

function NewSectionDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (v: { title: string; slug: string; section_type: Section["section_type"]; module_key: string; role_tags: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<Section["section_type"]>("guide");
  const [moduleKey, setModuleKey] = useState("");
  const [roleTags, setRoleTags] = useState("admin");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New manual section</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="slug (optional)" value={slug} onChange={e => setSlug(e.target.value)} />
          <Select value={type} onValueChange={(v) => setType(v as Section["section_type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="guide">Guide</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="runbook">Runbook</SelectItem>
              <SelectItem value="glossary">Glossary</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="module key (e.g. billing)" value={moduleKey} onChange={e => setModuleKey(e.target.value)} />
          <Input placeholder="roles (comma-separated)" value={roleTags} onChange={e => setRoleTags(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onCreate({ title, slug, section_type: type, module_key: moduleKey, role_tags: roleTags })} disabled={!title.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}