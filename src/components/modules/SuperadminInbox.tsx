import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Send, RefreshCw, Search, ShieldAlert, Eraser } from "lucide-react";
import { toast } from "sonner";
import { detectPhi, redactPhi, summarizeMatches } from "@/lib/phi-redaction";

interface Ticket {
  id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  created_by: string;
}

interface Message {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

const STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const CATEGORIES = ["general", "billing", "evv", "scheduling", "account", "bug", "other"];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  normal: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  waiting_customer: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  resolved: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  closed: "bg-muted text-muted-foreground",
};

export function SuperadminInbox() {
  const { user, hasRole } = useAuth();
  const isSuperadmin = hasRole("superadmin");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const replyMatches = useMemo(() => detectPhi(reply), [reply]);
  const replyHasPhi = replyMatches.length > 0;

  const loadAll = async () => {
    if (!isSuperadmin) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id,subject,body,category,priority,status,created_at,updated_at,company_id,created_by")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Ticket[];
    setTickets(rows);

    const companyIds = Array.from(new Set(rows.map((t) => t.company_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(rows.map((t) => t.created_by)));

    if (companyIds.length) {
      const { data: cs } = await supabase
        .from("companies")
        .select("id,legal_name,display_name")
        .in("id", companyIds);
      const map: Record<string, string> = {};
      (cs ?? []).forEach((c: any) => { map[c.id] = c.display_name || c.legal_name; });
      setCompanies(map);
    }
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setAuthors(map);
    }
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_ticket_messages")
      .select("id,ticket_id,author_id,body,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setMessages((data ?? []) as Message[]);
    const missing = Array.from(new Set((data ?? []).map((m: any) => m.author_id)))
      .filter((id) => !authors[id]);
    if (missing.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name").in("id", missing);
      const map = { ...authors };
      (ps ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setAuthors(map);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [isSuperadmin]);

  // Open a specific ticket when requested via notification deep-link.
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (typeof id === "string") setSelectedId(id);
    };
    window.addEventListener("cw:open-ticket", handler);
    // Initial URL param (in case the inbox mounts after the event fired).
    const params = new URLSearchParams(window.location.search);
    const t = params.get("ticket");
    if (t) setSelectedId(t);
    return () => window.removeEventListener("cw:open-ticket", handler);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const channel = supabase
      .channel(`ticket-${selectedId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${selectedId}` },
        () => loadMessages(selectedId)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (companyFilter !== "all" && (t.company_id ?? "none") !== companyFilter) return false;
      if (q && !(`${t.subject} ${t.body}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, companyFilter, search]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) || null, [tickets, selectedId]);

  const companyOptions = useMemo(() => {
    const ids = Array.from(new Set(tickets.map((t) => t.company_id ?? "none")));
    return ids.map((id) => ({
      id,
      label: id === "none" ? "— No company —" : (companies[id] || `Company ${id.slice(0, 8)}`),
    }));
  }, [tickets, companies]);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const prev = selected.status;
    setTickets((arr) => arr.map((t) => (t.id === selected.id ? { ...t, status } : t)));
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selected.id);
    if (error) {
      toast.error(error.message);
      setTickets((arr) => arr.map((t) => (t.id === selected.id ? { ...t, status: prev } : t)));
    } else {
      toast.success(`Status → ${status}`);
    }
  };

  const updatePriority = async (priority: string) => {
    if (!selected) return;
    const prev = selected.priority;
    setTickets((arr) => arr.map((t) => (t.id === selected.id ? { ...t, priority } : t)));
    const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", selected.id);
    if (error) {
      toast.error(error.message);
      setTickets((arr) => arr.map((t) => (t.id === selected.id ? { ...t, priority: prev } : t)));
    }
  };

  const handleRedact = () => {
    setReply((b) => redactPhi(b).redacted);
    toast.info("PHI patterns replaced — review before sending.");
  };

  const sendReply = async () => {
    if (!selected || !user?.id || !reply.trim()) return;
    if (replyHasPhi) { toast.error("Remove PHI before sending."); return; }
    setSending(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: selected.id,
      author_id: user.id,
      body: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(error.message.includes("PHI_BLOCKED") ? "PHI detected — message blocked." : error.message);
      return;
    }
    setReply("");
    toast.success("Reply sent");
    // If ticket is open, bump to in_progress
    if (selected.status === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", selected.id);
      setTickets((arr) => arr.map((t) => (t.id === selected.id ? { ...t, status: "in_progress" } : t)));
    }
  };

  if (!isSuperadmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Restricted
          </CardTitle>
          <CardDescription>This inbox is available to superadmins only.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 sm:h-8 sm:w-8" /> Support Inbox
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Cross-agency view of every support ticket. Triage, reply, and update status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subject/body"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* Ticket list */}
        <Card className="min-h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {filtered.length} ticket{filtered.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No tickets match the filters.</p>
            ) : (
              <ul className="divide-y max-h-[70vh] overflow-y-auto">
                {filtered.map((t) => {
                  const isSel = t.id === selectedId;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left p-3 hover:bg-muted/50 transition ${isSel ? "bg-muted" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate flex-1">{t.subject}</p>
                          <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[t.priority] || ""}`}>
                            {t.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge className={`text-[10px] ${STATUS_COLORS[t.status] || ""}`} variant="outline">
                            {t.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {t.company_id ? (companies[t.company_id] || "Unknown agency") : "No company"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            · {new Date(t.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Thread */}
        <Card className="min-h-[400px]">
          {!selected ? (
            <CardContent className="p-6 text-sm text-muted-foreground">
              Select a ticket to view the full thread.
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base break-words">{selected.subject}</CardTitle>
                    <CardDescription className="mt-1">
                      {authors[selected.created_by] || "User"} ·{" "}
                      {selected.company_id ? (companies[selected.company_id] || "Unknown agency") : "No company"} ·{" "}
                      {new Date(selected.created_at).toLocaleString()} · {selected.category}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Select value={selected.priority} onValueChange={updatePriority}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={selected.status} onValueChange={updateStatus}>
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {authors[selected.created_by] || "User"} · {new Date(selected.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
                </div>
                {messages.map((m) => {
                  const mine = m.author_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-md border p-3 ${mine ? "bg-primary/5 border-primary/30" : "bg-card"}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {mine ? "You (superadmin)" : authors[m.author_id] || "User"} ·{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    </div>
                  );
                })}
              </CardContent>
              <div className="border-t p-4 space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write a reply. No PHI — reference clients by internal ID only."
                  maxLength={5000}
                />
                {replyHasPhi && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      PHI detected: {summarizeMatches(replyMatches)}
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={handleRedact}>
                      <Eraser className="h-3.5 w-3.5 mr-1" /> Auto-redact
                    </Button>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || replyHasPhi || !reply.trim()}>
                    <Send className="h-4 w-4 mr-1" /> Send reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SuperadminInbox;