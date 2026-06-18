import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Membership {
  company_id: string;
  company_role: string;
  company: { id: string; display_name: string | null; legal_name: string | null } | null;
}

export function DefaultCompanySetting() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [defaultId, setDefaultId] = useState<string>("");
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: mem }] = await Promise.all([
      supabase.from("profiles").select("default_company_id").eq("id", user.id).maybeSingle(),
      supabase.from("company_users")
        .select("company_id, company_role, company:companies(id, display_name, legal_name)")
        .eq("user_id", user.id),
    ]);
    const list = (mem ?? []) as unknown as Membership[];
    setMemberships(list);
    const cur = (prof as any)?.default_company_id ?? list[0]?.company_id ?? "";
    setDefaultId(cur);
    setSelected(cur);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !selected) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ default_company_id: selected }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setDefaultId(selected);
    toast({ title: "Default company updated", description: "Billing and other jobs will now use this company." });
  };

  const label = (m: Membership) =>
    m.company?.display_name ?? m.company?.legal_name ?? m.company_id.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Default Company</CardTitle>
        <CardDescription>
          Used by billing runs, Sandata imports, revenue cycle, and other background jobs that need a company context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">You aren't a member of any company yet. Complete company onboarding first.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label className="text-xs">Choose your default company</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                  <SelectContent>
                    {memberships.map(m => (
                      <SelectItem key={m.company_id} value={m.company_id}>
                        <div className="flex items-center gap-2">
                          <span>{label(m)}</span>
                          <Badge variant="outline" className="text-[10px]">{m.company_role}</Badge>
                          {m.company_id === defaultId && <Badge className="text-[10px]"><Check className="h-3 w-3 mr-1" />Current</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={save} disabled={saving || !selected || selected === defaultId}>
                {saving ? "Saving…" : "Set as default"}
              </Button>
            </div>
            {memberships.length > 1 && (
              <p className="text-xs text-muted-foreground">
                You belong to {memberships.length} companies. Switching here changes which company's data drives billing, payroll, and reports for your session.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}