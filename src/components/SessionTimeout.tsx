import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEFAULT_TIMEOUT_MIN = 15;
const WARN_BEFORE_MS = 60_000;

/**
 * HIPAA §164.312(a)(2)(iii): automatic logoff after period of inactivity.
 * Reads company policy if available, defaults to 15 min.
 */
export function SessionTimeout() {
  const { user, signOut } = useAuth();
  const [timeoutMin, setTimeoutMin] = useState(DEFAULT_TIMEOUT_MIN);
  const [warnOpen, setWarnOpen] = useState(false);
  const lastActivity = useRef<number>(Date.now());
  const warnTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("company_security_policy")
        .select("session_timeout_minutes").maybeSingle();
      if (data?.session_timeout_minutes) setTimeoutMin(data.session_timeout_minutes);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ms = timeoutMin * 60_000;
    const reset = () => {
      lastActivity.current = Date.now();
      setWarnOpen(false);
      if (warnTimer.current) window.clearTimeout(warnTimer.current);
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
      warnTimer.current = window.setTimeout(() => setWarnOpen(true), ms - WARN_BEFORE_MS);
      logoutTimer.current = window.setTimeout(async () => {
        setWarnOpen(false);
        await signOut();
      }, ms);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (warnTimer.current) window.clearTimeout(warnTimer.current);
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
    };
  }, [user, timeoutMin, signOut]);

  if (!user) return null;
  return (
    <AlertDialog open={warnOpen} onOpenChange={setWarnOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You're about to be signed out</AlertDialogTitle>
          <AlertDialogDescription>
            For security and HIPAA compliance, your session will end in 60 seconds due to inactivity.
            Click "Stay signed in" to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => signOut()}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={() => setWarnOpen(false)}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}