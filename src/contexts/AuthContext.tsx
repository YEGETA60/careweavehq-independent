import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "superadmin"
  | "admin"
  | "manager"
  | "operations_manager"
  | "supervisor"
  | "scheduler"
  | "caregiver"
  | "billing"
  | "family";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const rolesLoadedForUserIdRef = useRef<string | null>(null);

  const loadRoles = async (uid: string): Promise<AppRole[]> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) {
      console.error("Unable to load user roles", error);
      return [];
    }
    return (data ?? []).map((r: { role: AppRole }) => r.role);
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (newSession: Session | null) => {
      if (!mounted) return;
      const nextUserId = newSession?.user?.id ?? null;
      const userChanged = currentUserIdRef.current !== nextUserId;
      const rolesNeedLoad = !!nextUserId && rolesLoadedForUserIdRef.current !== nextUserId;
      if (userChanged || rolesNeedLoad) setLoading(true);
      currentUserIdRef.current = nextUserId;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (nextUserId && rolesNeedLoad) {
        const nextRoles = await loadRoles(nextUserId);
        if (!mounted || currentUserIdRef.current !== nextUserId) return;
        setRoles(nextRoles);
        rolesLoadedForUserIdRef.current = nextUserId;
      } else if (!nextUserId) {
        currentUserIdRef.current = null;
        rolesLoadedForUserIdRef.current = null;
        setRoles([]);
      } else {
        currentUserIdRef.current = nextUserId;
      }
      if (mounted) setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setTimeout(() => { void applySession(newSession); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void applySession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
}