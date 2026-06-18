import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface Settings {
  maintenance_mode: boolean;
  maintenance_message: string | null;
  feature_flags: Record<string, unknown>;
}

interface SendStats {
  sent: number;
  failed: number;
  last24h: number;
}

export function WebAdmin() {
  const { hasRole } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [flagsText, setFlagsText] = useState("{}");
  const [stats, setStats] = useState<SendStats>({ sent: 0, failed: 0, last24h: 0 });

  const load = useCallback(async () => {
    const [set, log] = await Promise.all([
      (supabase as any).from("site_settings").select("*").eq("id", 1).maybeSingle(),
      (supabase as any).from("email_send_log").select("status, created_at").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);
    if (set.data) {
      const s = set.data as Settings;
      setSettings(s);
      setFlagsText(JSON.stringify(s.feature_flags ?? {}, null, 2));
    }
    if (log.data) {
      const rows = log.data as { status: string }[];
      setStats({
        sent: rows.filter(r => r.status === "sent").length,
        failed: rows.filter(r => r.status === "failed").length,
        last24h: rows.length,
      });
    }
  }, []);

  useEffect(() => { if (hasRole("superadmin")) load(); }, [hasRole, load]);

  if (!hasRole("superadmin")) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <h2 className="text-xl font-semibold">Superadmins only</h2>
        <p className="text-muted-foreground text-sm mt-2">This panel manages maintenance, configuration and performance.</p>
      </div>
    );
  }

  const saveSettings = async () => {
    if (!settings) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(flagsText); } catch { return toast.error("Feature flags must be valid JSON"); }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("site_settings").update({
      maintenance_mode: settings.maintenance_mode,
      maintenance_message: settings.maintenance_message,
      feature_flags: parsed,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>Block non-superadmin access and show a notice site-wide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="maint">Maintenance mode</Label>
                <Switch id="maint" checked={settings.maintenance_mode}
                  onCheckedChange={(v) => setSettings({ ...settings, maintenance_mode: v })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="msg">Notice shown to users</Label>
                <Textarea id="msg" rows={2} value={settings.maintenance_message ?? ""}
                  onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                  placeholder="We'll be back shortly." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="flags">Feature flags (JSON)</Label>
                <Textarea id="flags" rows={6} value={flagsText} onChange={(e) => setFlagsText(e.target.value)} className="font-mono text-xs" />
              </div>
              <Button onClick={saveSettings}>Save configuration</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Performance — last 24h</CardTitle>
            <CardDescription>Email pipeline health</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total" value={stats.last24h} />
            <Stat label="Sent" value={stats.sent} tone="success" />
            <Stat label="Failed" value={stats.failed} tone={stats.failed > 0 ? "danger" : undefined} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-green-600" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}