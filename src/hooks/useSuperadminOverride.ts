import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const KEY = "superadmin_support_override";
const EVT = "superadmin-override-changed";

function read(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function useSuperadminOverride() {
  const { hasRole } = useAuth();
  const isSuperadmin = hasRole("superadmin");
  const [enabled, setEnabledState] = useState<boolean>(() => read());

  useEffect(() => {
    const handler = () => setEnabledState(read());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setEnabled = (v: boolean) => {
    try {
      if (v) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch { /* ignore */ }
    setEnabledState(v);
    window.dispatchEvent(new Event(EVT));
  };

  // Only effective for superadmins. Non-superadmins always get false.
  return {
    isSuperadmin,
    overrideEnabled: isSuperadmin && enabled,
    setOverrideEnabled: setEnabled,
  };
}