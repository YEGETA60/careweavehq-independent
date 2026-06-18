import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { DefaultCompanySetting } from "@/components/DefaultCompanySetting";
import { CompanyLogoUploader } from "@/components/CompanyLogoUploader";

export function CompanyProfile() {
  const { user } = useAuth();
  const subInfo = useSubscription();
  const [company, setCompany] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [tier, setTier] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await (supabase as any).from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    if (!prof?.default_company_id) return;
    const cid = prof.default_company_id;
    const [{ data: c }, { data: s }, { data: ts }, { data: mem }] = await Promise.all([
      (supabase as any).from("companies")
        .select("id,legal_name,display_name,email,phone,website,address_line1,address_line2,city,state,postal_code,country,logo_url,timezone,settings,created_by,created_at,updated_at")
        .eq("id", cid).maybeSingle(),
      (supabase as any).from("company_subscriptions").select("*").eq("company_id", cid).maybeSingle(),
      (supabase as any).from("subscription_tiers").select("*").order("sort_order"),
      (supabase as any).from("company_users").select("company_role").eq("company_id", cid).eq("user_id", user.id).maybeSingle(),
    ]);
    // tax_id / edi_submitter_id are column-restricted; fetch via secure RPC for admins.
    let billingIdent: { tax_id?: string | null; edi_submitter_id?: string | null } = {};
    try {
      const { data: ident } = await (supabase as any).rpc("get_company_billing_identity", { _company_id: cid });
      if (Array.isArray(ident) && ident[0]) billingIdent = ident[0];
    } catch { /* non-admin: ignore */ }
    setCompany({ ...(c ?? {}), ...billingIdent });
    setSub(s); setTiers(ts ?? []);
    setTier((ts ?? []).find((t: any) => t.id === s?.tier_id));
    setCanEdit(["owner","admin"].includes(mem?.company_role));
  };
  useEffect(() => { load(); }, [user]);

  if (!company) return <div className="p-6 text-muted-foreground">No company found.</div>;

  const update = (k: string, v: any) => setCompany({ ...company, [k]: v });

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("companies").update({
      legal_name: company.legal_name, display_name: company.display_name,
      tax_id: company.tax_id, email: company.email, phone: company.phone, website: company.website,
      address_line1: company.address_line1, address_line2: company.address_line2,
      city: company.city, state: company.state, postal_code: company.postal_code,
      country: company.country, timezone: company.timezone, settings: company.settings,
    }).eq("id", company.id);
    setSaving(false);
    toast({ title: error ? "Save failed" : "Saved", description: error?.message, variant: error ? "destructive" : "default" });
  };

  const changeTier = async (newTierId: string) => {
    if (!sub) return;
    const { error } = await (supabase as any).from("company_subscriptions")
      .update({ tier_id: newTierId }).eq("id", sub.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan updated" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground text-sm">Legal info, settings, and subscription.</p>
        </div>
        <Badge variant={sub?.status === "active" ? "default" : "secondary"}>
          {tier?.name ?? "No plan"} · {sub?.status ?? "—"}
        </Badge>
      </div>

      <Tabs defaultValue="legal">
        <TabsList><TabsTrigger value="legal">Legal & Contact</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger><TabsTrigger value="subscription">Subscription</TabsTrigger></TabsList>

        <TabsContent value="legal">
          <Card><CardHeader><CardTitle>Legal & Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Legal Name *</Label><Input value={company.legal_name||""} disabled={!canEdit} onChange={e=>update("legal_name", e.target.value)} /></div>
              <div><Label>Display / DBA</Label><Input value={company.display_name||""} disabled={!canEdit} onChange={e=>update("display_name", e.target.value)} /></div>
              <div><Label>EIN / Tax ID</Label><Input value={company.tax_id||""} disabled={!canEdit} onChange={e=>update("tax_id", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={company.phone||""} disabled={!canEdit} onChange={e=>update("phone", e.target.value)} /></div>
              <div><Label>Email</Label><Input value={company.email||""} disabled={!canEdit} onChange={e=>update("email", e.target.value)} /></div>
              <div><Label>Website</Label><Input value={company.website||""} disabled={!canEdit} onChange={e=>update("website", e.target.value)} /></div>
            </div>
            <div><Label>Address Line 1</Label><Input value={company.address_line1||""} disabled={!canEdit} onChange={e=>update("address_line1", e.target.value)} /></div>
            <div><Label>Address Line 2</Label><Input value={company.address_line2||""} disabled={!canEdit} onChange={e=>update("address_line2", e.target.value)} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>City</Label><Input value={company.city||""} disabled={!canEdit} onChange={e=>update("city", e.target.value)} /></div>
              <div><Label>State</Label><Input value={company.state||""} disabled={!canEdit} onChange={e=>update("state", e.target.value)} /></div>
              <div><Label>ZIP</Label><Input value={company.postal_code||""} disabled={!canEdit} onChange={e=>update("postal_code", e.target.value)} /></div>
              <div><Label>Country</Label><Input value={company.country||""} disabled={!canEdit} onChange={e=>update("country", e.target.value)} /></div>
            </div>
            {canEdit && <Button onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Button>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="mb-3">
            <DefaultCompanySetting />
          </div>
          <Card><CardHeader><CardTitle>Settings</CardTitle><CardDescription>Operating preferences</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Timezone</Label><Input value={company.timezone||""} disabled={!canEdit} onChange={e=>update("timezone", e.target.value)} /></div>
            <CompanyLogoUploader
              companyId={company.id}
              currentLogoUrl={company.logo_url}
              disabled={!canEdit}
              onUploaded={(url) => update("logo_url", url)}
            />
            <div><Label>Custom settings (JSON)</Label>
              <Textarea rows={6} disabled={!canEdit}
                value={JSON.stringify(company.settings||{}, null, 2)}
                onChange={e=>{ try{ update("settings", JSON.parse(e.target.value)); }catch{} }} />
            </div>
            {canEdit && <Button onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</Button>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card><CardHeader><CardTitle>Subscription</CardTitle>
          <CardDescription>Current plan: <strong>{tier?.name ?? "—"}</strong> · Status: {sub?.status}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date() && (
              <p className="text-sm text-muted-foreground">Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}</p>
            )}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              You currently have <strong>{subInfo.activeClientCount}</strong> active client{subInfo.activeClientCount === 1 ? "" : "s"}.
              {" "}Pricing band: <strong>{subInfo.currentBand === "large" ? `>${subInfo.clientBandThreshold} clients` : `≤${subInfo.clientBandThreshold} clients`}</strong>
              {subInfo.currentMonthlyPrice != null && <> · Billed at <strong>${subInfo.currentMonthlyPrice}/mo</strong></>}
              {subInfo.currentBand === "small" && subInfo.activeClientCount >= subInfo.clientBandThreshold - 1 && subInfo.largeMonthlyPrice != null && (
                <div className="mt-1 text-amber-600 dark:text-amber-400">
                  Adding more than {subInfo.clientBandThreshold} active clients will move you to the larger band (${subInfo.largeMonthlyPrice}/mo).
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {tiers.map(t => (
                <div key={t.id} className={`p-4 border rounded-lg ${t.id === sub?.tier_id ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.description}</div>
                    </div>
                    <div className="text-right text-xs space-y-0.5">
                      <div className={t.id === sub?.tier_id && subInfo.currentBand === "small" ? "font-semibold text-primary" : ""}>
                        ≤{t.client_band_threshold ?? 10}: {t.monthly_price>0 ? <>${t.monthly_price}/mo</> : <span className="italic text-muted-foreground">TBD</span>}
                      </div>
                      <div className={t.id === sub?.tier_id && subInfo.currentBand === "large" ? "font-semibold text-primary" : ""}>
                        &gt;{t.client_band_threshold ?? 10}: {t.monthly_price_large>0 ? <>${t.monthly_price_large}/mo</> : <span className="italic text-muted-foreground">—</span>}
                      </div>
                    </div>
                  </div>
                  {canEdit && t.id !== sub?.tier_id && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={()=>changeTier(t.id)}>Switch to {t.name}</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}