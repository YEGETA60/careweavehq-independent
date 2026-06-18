import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyInfo {
  id: string;
  legal_name: string;
  display_name?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  logo_url?: string | null;
  timezone?: string | null;
}

let cached: CompanyInfo | null = null;
const listeners = new Set<(c: CompanyInfo | null) => void>();

export function setCachedCompany(c: CompanyInfo | null) {
  cached = c;
  listeners.forEach((l) => l(c));
}

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const cb = (c: CompanyInfo | null) => setCompany(c);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data: prof } = await (supabase as any)
        .from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
      if (!prof?.default_company_id) { if (active) setLoading(false); return; }
      const { data: c } = await (supabase as any)
        .from("companies")
        .select("id,legal_name,display_name,email,phone,website,address_line1,address_line2,city,state,postal_code,country,logo_url,timezone")
        .eq("id", prof.default_company_id)
        .maybeSingle();
      if (active && c) { setCachedCompany(c as CompanyInfo); }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]);

  return { company, loading };
}

export function formatCompanyAddress(c?: CompanyInfo | null): string {
  if (!c) return "";
  const line2 = [c.city, c.state].filter(Boolean).join(", ");
  return [c.address_line1, c.address_line2, [line2, c.postal_code].filter(Boolean).join(" "), c.country]
    .filter(Boolean).join(" · ");
}