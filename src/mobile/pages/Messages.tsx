import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { detectPhi, summarizeMatches } from "@/lib/phi-redaction";
import { uploadMessageAttachment, loadAttachmentsForMessages, type MessageAttachment } from "@/lib/message-attachments";
import { AttachButton, MessageAttachmentChip } from "@/components/MessageAttachment";

const MGMT: AppRole[] = ["admin", "manager", "operations_manager", "supervisor"];

interface Contact { user_id: string; full_name: string | null; email: string | null; }
interface Message { id: string; sender_id: string; recipient_id: string; body: string; read_at: string | null; created_at: string; }

export function Messages() {
  const { user, hasAnyRole } = useAuth();
  const isManager = hasAnyRole(MGMT);
  const navigate = useNavigate();
  const { contactId } = useParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Record<string, MessageAttachment[]>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    if (isManager) {
      const { data } = await supabase.rpc("list_users_with_roles");
      setContacts(((data ?? []) as any[]).filter(u => u.user_id !== user.id)
        .map(u => ({ user_id: u.user_id, full_name: u.full_name, email: u.email })));
    } else {
      const { data: msgs } = await (supabase as any).from("messages").select("sender_id,recipient_id");
      const ids = new Set<string>();
      (msgs ?? []).forEach((m: any) => {
        if (m.sender_id !== user.id) ids.add(m.sender_id);
        if (m.recipient_id !== user.id) ids.add(m.recipient_id);
      });
      const { data: roleRows } = await (supabase as any).from("user_roles").select("user_id, role")
        .in("role", ["admin", "manager", "operations_manager", "supervisor"]);
      (roleRows ?? []).forEach((r: any) => { if (r.user_id !== user.id) ids.add(r.user_id); });
      const { data: profiles } = await (supabase as any).from("profiles").select("id, full_name").in("id", Array.from(ids));
      setContacts((profiles ?? []).map((p: any) => ({ user_id: p.id, full_name: p.full_name, email: null })));
    }
  }, [isManager, user?.id]);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any).from("messages").select("*").order("created_at", { ascending: true });
    const rows = (data ?? []) as Message[];
    setMessages(rows);
    const map = await loadAttachmentsForMessages(rows.map(r => r.id));
    setAttachments(map);
  }, [user?.id]);

  useEffect(() => { loadContacts(); loadMessages(); }, [loadContacts, loadMessages]);

  useEffect(() => {
    const ch = supabase
      .channel("mobile-messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadMessages]);

  useEffect(() => { if (contactId) setActive(contactId); }, [contactId]);

  const threadMessages = useMemo(() =>
    !active ? [] : messages.filter(m =>
      (m.sender_id === user?.id && m.recipient_id === active) ||
      (m.sender_id === active && m.recipient_id === user?.id)
    ), [messages, active, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threadMessages.length]);

  useEffect(() => {
    if (!active || !user?.id) return;
    const unread = threadMessages.filter(m => m.recipient_id === user.id && !m.read_at).map(m => m.id);
    if (unread.length) {
      (supabase as any).from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
    }
  }, [active, threadMessages, user?.id]);

  const send = async () => {
    if ((!draft.trim() && pendingFiles.length === 0) || !active || !user?.id) return;
    if (draft.trim()) {
      const matches = detectPhi(draft);
      if (matches.length > 0) {
        toast.error(`Possible PHI detected (${summarizeMatches(matches)}). Remove PHI before sending.`);
        return;
      }
    }
    setSending(true);
    const body = draft.trim() || (pendingFiles.length ? `📎 ${pendingFiles.length} attachment(s)` : "");
    const { data: inserted, error } = await (supabase as any).from("messages").insert({
      sender_id: user.id, recipient_id: active, body
    }).select().single();
    if (error || !inserted) { setSending(false); return toast.error(error?.message || "Send failed"); }
    for (const f of pendingFiles) {
      const res = await uploadMessageAttachment(f, inserted.id, active, user.id);
      if (res.ok === false) toast.error(`${f.name}: ${res.error}`);
    }
    setDraft("");
    setPendingFiles([]);
    setSending(false);
    loadMessages();
  };

  const unreadCount = (cid: string) =>
    messages.filter(m => m.sender_id === cid && m.recipient_id === user?.id && !m.read_at).length;

  const lastMessage = (cid: string) => {
    const t = messages.filter(m =>
      (m.sender_id === cid && m.recipient_id === user?.id) ||
      (m.recipient_id === cid && m.sender_id === user?.id)
    );
    return t[t.length - 1];
  };

  const filtered = contacts.filter(c =>
    (c.full_name || c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeContact = contacts.find(c => c.user_id === active);

  // Thread view
  if (active) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex items-center gap-2 border-b p-3 bg-background sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setActive(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold truncate">{activeContact?.full_name || activeContact?.email || "Conversation"}</p>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {threadMessages.map(m => {
            const mine = m.sender_id === user?.id;
            const atts = attachments[m.id] ?? [];
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  {atts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {atts.map(a => <MessageAttachmentChip key={a.id} a={a} mine={mine} />)}
                    </div>
                  )}
                  <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && m.read_at && " · Read"}
                  </p>
                </div>
              </div>
            );
          })}
          {threadMessages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet — say hi 👋</p>
          )}
        </div>
        <div className="border-t p-2 space-y-1 bg-background">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pendingFiles.map((f, i) => (
                <span key={i} className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-1 max-w-[150px]">
                  <span className="truncate">{f.name}</span>
                  <button className="opacity-60" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <AttachButton disabled={sending} onPick={(fl) => setPendingFiles(p => [...p, ...Array.from(fl)])} />
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message…"
            />
            <Button onClick={send} disabled={sending || (!draft.trim() && pendingFiles.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Inbox view
  return (
    <div className="px-3 pt-4 space-y-3">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6" /> Messages
      </h1>
      <p className="text-xs text-muted-foreground">
        PHI (SSNs, DOBs, MRNs, diagnoses) is automatically blocked. Use only for non-PHI coordination.
      </p>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map(c => {
          const unread = unreadCount(c.user_id);
          const last = lastMessage(c.user_id);
          return (
            <Card
              key={c.user_id}
              className="p-3 cursor-pointer active:bg-muted"
              onClick={() => setActive(c.user_id)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{c.full_name || c.email || c.user_id.slice(0, 8)}</p>
                {unread > 0 && <Badge variant="destructive" className="text-xs">{unread}</Badge>}
              </div>
              {last && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {last.sender_id === user?.id ? "You: " : ""}{last.body}
                </p>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No conversations yet.
          </Card>
        )}
      </div>
    </div>
  );
}
