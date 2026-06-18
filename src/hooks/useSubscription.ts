import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionState {
  loading: boolean;
  companyId: string | null;
  tierId: string | null;
  tierSlug: string | null;
  tierName: string | null;
  includedModules: string[];
  status: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  isReadOnly: boolean;
  activeClientCount: number;
  clientBandThreshold: number;
  currentBand: "small" | "large";
  currentMonthlyPrice: number | null;
  currentYearlyPrice: number | null;
  largeMonthlyPrice: number | null;
  largeYearlyPrice: number | null;
  isModuleUnlocked: (moduleId: string) => boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [state, setState] = useState<Omit<SubscriptionState, "isModuleUnlocked" | "refresh">>({
    loading: true,
    companyId: null,
    tierId: null,
    tierSlug: null,
    tierName: null,
    includedModules: [],
    status: null,
    isTrialing: false,
    trialEndsAt: null,
    trialDaysLeft: null,
    isReadOnly: false,
    activeClientCount: 0,
    clientBandThreshold: 10,
    currentBand: "small",
    currentMonthlyPrice: null,
    currentYearlyPrice: null,
    largeMonthlyPrice: null,
    largeYearlyPrice: null,
  });

  const load = useCallback(async () => {
    if (authLoading) { setState((s) => ({ ...s, loading: true })); return; }
    if (!user) { setState((s) => ({ ...s, loading: false })); return; }
    if (hasRole("superadmin")) {
      setState((s) => ({
        ...s,
        loading: false,
        status: null,
        isTrialing: false,
        trialEndsAt: null,
        trialDaysLeft: null,
        isReadOnly: false,
        includedModules: ["*"],
      }));
      return;
    }
    const { data: prof } = await (supabase as any)
      .from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    const cid = prof?.default_company_id ?? null;
    if (!cid) { setState((s) => ({ ...s, loading: false, companyId: null })); return; }

    const [{ data: sub }, { data: tiers }, { count: activeCount }] = await Promise.all([
      (supabase as any).from("company_subscriptions").select("*").eq("company_id", cid).maybeSingle(),
      (supabase as any).from("subscription_tiers").select("*").eq("active", true).order("sort_order"),
      (supabase as any).from("clients").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "active"),
    ]);

    const isTrialing = !!sub && sub.status === "trialing" && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date();
    const effectiveTier = isTrialing
      ? (tiers ?? []).find((t: any) => t.slug === "standard")
      : (tiers ?? []).find((t: any) => t.id === sub?.tier_id) ?? (tiers ?? []).find((t: any) => t.slug === "standard");

    let trialDaysLeft: number | null = null;
    if (isTrialing && sub?.trial_ends_at) {
      const ms = new Date(sub.trial_ends_at).getTime() - Date.now();
      trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    const trialExpired = !!sub && sub.status === "trialing"
      && sub.trial_ends_at && new Date(sub.trial_ends_at) <= new Date()
      && !sub.external_subscription_id;
    const canceledExpired = !!sub && ["canceled","unpaid","incomplete_expired"].includes(sub.status)
      && (!sub.current_period_end || new Date(sub.current_period_end) < new Date());
    const isReadOnly = !!(trialExpired || canceledExpired);

    const threshold = effectiveTier?.client_band_threshold ?? 10;
    const n = activeCount ?? 0;
    const band: "small" | "large" = n > threshold && effectiveTier?.monthly_price_large != null ? "large" : "small";
    const currentMonthlyPrice = band === "large" ? Number(effectiveTier?.monthly_price_large) : Number(effectiveTier?.monthly_price ?? 0);
    const currentYearlyPrice = band === "large" ? Number(effectiveTier?.yearly_price_large) : Number(effectiveTier?.yearly_price ?? 0);

    setState({
      loading: false,
      companyId: cid,
      tierId: effectiveTier?.id ?? null,
      tierSlug: effectiveTier?.slug ?? null,
      tierName: effectiveTier?.name ?? null,
      includedModules: effectiveTier?.included_modules ?? [],
      status: sub?.status ?? null,
      isTrialing,
      trialEndsAt: sub?.trial_ends_at ?? null,
      trialDaysLeft,
      isReadOnly,
      activeClientCount: n,
      clientBandThreshold: threshold,
      currentBand: band,
      currentMonthlyPrice,
      currentYearlyPrice,
      largeMonthlyPrice: effectiveTier?.monthly_price_large != null ? Number(effectiveTier.monthly_price_large) : null,
      largeYearlyPrice: effectiveTier?.yearly_price_large != null ? Number(effectiveTier.yearly_price_large) : null,
    });
  }, [user, authLoading, hasRole]);

  useEffect(() => { load(); }, [load]);

  const isModuleUnlocked = useCallback((moduleId: string) => {
    // Superadmins always have access to everything
    if (hasRole("superadmin")) return true;
    if (state.loading) return true; // optimistic until loaded
    return state.includedModules.includes(moduleId);
  }, [state.includedModules, state.loading, hasRole]);

  return { ...state, isModuleUnlocked, refresh: load };
}