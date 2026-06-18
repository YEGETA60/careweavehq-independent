import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export function SubscriptionTiersAdmin() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("subscription_tiers").select("*").order("sort_order");
    setTiers(data ?? []); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (idx: number, patch: any) =>
    setTiers(tiers.map((t,i) => i===idx ? { ...t, ...patch } : t));

  const save = async (t: any) => {
    const { error } = await (supabase as any).from("subscription_tiers").update({
      name: t.name, description: t.description,
      monthly_price: Number(t.monthly_price)||0,
      yearly_price: Number(t.yearly_price)||0,
      monthly_price_large: t.monthly_price_large === "" || t.monthly_price_large == null ? null : Number(t.monthly_price_large),
      yearly_price_large: t.yearly_price_large === "" || t.yearly_price_large == null ? null : Number(t.yearly_price_large),
      client_band_threshold: Number(t.client_band_threshold) || 10,
      currency: t.currency, max_users: t.max_users, max_clients: t.max_clients,
      max_caregivers: t.max_caregivers, included_modules: t.included_modules,
      features: t.features, active: t.active,
    }).eq("id", t.id);
    toast({ title: error ? "Save failed" : `${t.name} saved`, description: error?.message,
            variant: error ? "destructive" : "default" });
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Subscription Tiers</h1>
        <p className="text-muted-foreground text-sm">Set prices and limits for each plan. Leave price at 0 to show "TBD".</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {tiers.map((t, idx) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Input className="text-lg font-bold max-w-xs" value={t.name} onChange={e=>update(idx,{name:e.target.value})} />
                <div className="flex items-center gap-2 text-sm font-normal">
                  Active <Switch checked={t.active} onCheckedChange={v=>update(idx,{active:v})} />
                </div>
              </CardTitle>
              <CardDescription>Slug: <code>{t.slug}</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Description</Label>
                <Textarea rows={2} value={t.description||""} onChange={e=>update(idx,{description:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monthly price — small band ($)</Label>
                  <Input type="number" step="0.01" value={t.monthly_price} onChange={e=>update(idx,{monthly_price:e.target.value})} placeholder="Add price" />
                </div>
                <div><Label>Yearly price — small band ($)</Label>
                  <Input type="number" step="0.01" value={t.yearly_price} onChange={e=>update(idx,{yearly_price:e.target.value})} placeholder="Add price" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Client band threshold</Label>
                  <Input type="number" value={t.client_band_threshold ?? 10} onChange={e=>update(idx,{client_band_threshold:e.target.value})} />
                </div>
                <div><Label>Monthly price — large band ($)</Label>
                  <Input type="number" step="0.01" value={t.monthly_price_large ?? ""} onChange={e=>update(idx,{monthly_price_large:e.target.value})} placeholder="e.g. 149" />
                </div>
                <div><Label>Yearly price — large band ($)</Label>
                  <Input type="number" step="0.01" value={t.yearly_price_large ?? ""} onChange={e=>update(idx,{yearly_price_large:e.target.value})} placeholder="e.g. 1490" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Max users</Label>
                  <Input type="number" value={t.max_users??""} onChange={e=>update(idx,{max_users:e.target.value?Number(e.target.value):null})} />
                </div>
                <div><Label>Max clients</Label>
                  <Input type="number" value={t.max_clients??""} onChange={e=>update(idx,{max_clients:e.target.value?Number(e.target.value):null})} />
                </div>
                <div><Label>Max caregivers</Label>
                  <Input type="number" value={t.max_caregivers??""} onChange={e=>update(idx,{max_caregivers:e.target.value?Number(e.target.value):null})} />
                </div>
              </div>
              <div><Label>Features (JSON array)</Label>
                <Textarea rows={4} value={JSON.stringify(t.features||[], null, 2)}
                  onChange={e=>{ try{ update(idx,{features:JSON.parse(e.target.value)}); }catch{} }} />
              </div>
              <Button onClick={()=>save(t)}>Save {t.name}</Button>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}