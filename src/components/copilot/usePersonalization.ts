import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  readProfile,
  writeProfile,
  clearProfile,
  recommendPath,
  type GuideProfile,
  type RecommendedStep,
  type StartingData,
} from "./personalization";

export function usePersonalization() {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<GuideProfile | null>(() => readProfile());
  const [data, setData] = useState<StartingData>({ clients: 0, caregivers: 0, visits: 0, invoices: 0 });
  const [loading, setLoading] = useState(false);

  // Keep profile in sync across components.
  useEffect(() => {
    const sync = () => setProfileState(readProfile());
    window.addEventListener("cw:onboarding-profile-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cw:onboarding-profile-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("default_company_id")
        .eq("id", user.id)
        .maybeSingle();
      const companyId = prof?.default_company_id;
      if (!companyId) return;
      const [clients, caregivers, visits, invoices] = await Promise.all([
        (supabase as any).from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        (supabase as any).from("caregivers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        (supabase as any).from("visits").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        (supabase as any).from("invoices").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      setData({
        clients: clients?.count ?? 0,
        caregivers: caregivers?.count ?? 0,
        visits: visits?.count ?? 0,
        invoices: invoices?.count ?? 0,
      });
    } catch {
      /* ignore — invoices table may not exist on every deployment */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refreshData(); }, [refreshData]);

  const saveProfile = useCallback((p: GuideProfile) => {
    writeProfile(p);
    setProfileState(p);
  }, []);

  const reset = useCallback(() => {
    clearProfile();
    setProfileState(null);
  }, []);

  const path: RecommendedStep[] = recommendPath(profile, data);

  return { profile, data, path, loading, saveProfile, reset, refreshData };
}