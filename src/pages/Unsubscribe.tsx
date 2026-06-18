import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "ready" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setState("invalid"); return; }
        if (data.email) setEmail(data.email);
        if (data.alreadyUnsubscribed || data.already_unsubscribed) setState("already");
        else setState("ready");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "error" : "done");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Email preferences</h1>
        {state === "loading" && <p className="text-muted-foreground">Verifying your link…</p>}
        {state === "invalid" && <p className="text-destructive">This unsubscribe link is invalid or expired.</p>}
        {state === "already" && <p className="text-muted-foreground">{email || "This address"} is already unsubscribed.</p>}
        {state === "ready" && (
          <>
            <p className="text-muted-foreground">
              Unsubscribe {email || "this address"} from CareWeaveHQ app emails?
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}
        {state === "submitting" && <p className="text-muted-foreground">Processing…</p>}
        {state === "done" && <p>You've been unsubscribed. You will no longer receive these emails.</p>}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again later.</p>}
      </Card>
    </main>
  );
}