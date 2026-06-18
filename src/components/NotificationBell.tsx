import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!user) return;
    setItems((arr) => arr.map((i) => ({ ...i, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  const handleClick = async (n: any) => {
    if (!user) return;
    if (!n.read) {
      setItems((arr) => arr.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (!n.link) return;

    if (n.link.startsWith("http")) {
      try {
        const u = new URL(n.link);
        if (u.origin !== window.location.origin) {
          // Block open-redirect to external origins from notifications.
          return;
        }
        window.location.href = u.pathname + u.search + u.hash;
      } catch {
        /* invalid URL — ignore */
      }
      return;
    }

    // In-app deep link: /?module=<id>&ticket=<id>&...
    try {
      const url = new URL(n.link, window.location.origin);
      const moduleId = url.searchParams.get("module");
      const ticketId = url.searchParams.get("ticket");
      const onAppRoot = window.location.pathname === "/" || window.location.pathname === url.pathname;

      if (moduleId && onAppRoot) {
        // Update the URL so refreshes preserve the deep link.
        window.history.replaceState({}, "", url.pathname + url.search);
        window.dispatchEvent(new CustomEvent("cw:navigate", { detail: moduleId }));
        if (ticketId) {
          // Defer so the target module mounts before we ask it to open the ticket.
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("cw:open-ticket", { detail: ticketId }));
          }, 50);
        }
        return;
      }
    } catch {
      /* fall through to full navigation */
    }
    window.location.assign(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && <button className="text-xs text-primary" onClick={markAllRead}>Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 && <div className="p-4 text-sm text-muted-foreground">No notifications.</div>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left p-3 border-b text-sm hover:bg-muted/70 transition ${!n.read ? "bg-muted/50" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-label="unread" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}