import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

/**
 * TOTP MFA enrollment using Supabase Auth's built-in factors.
 * Required for admin/billing roles per company_security_policy.
 */
export function MfaEnrollDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"start" | "verify">("start");
  const [factorId, setFactorId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("verify");
  };

  const verify = async () => {
    setBusy(true);
    const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr) { setBusy(false); return toast.error(cErr.message); }
    const { error } = await supabase.auth.mfa.verify({
      factorId, challengeId: chal.id, code,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.from("user_security_settings").upsert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      mfa_enrolled: true,
      mfa_enrolled_at: new Date().toISOString(),
    });
    toast.success("MFA enabled");
    setOpen(false);
    setStep("start"); setCode("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShieldCheck className="h-4 w-4" /> Enable MFA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-factor authentication</DialogTitle>
          <DialogDescription>
            Add an extra layer of security with a TOTP authenticator app
            (Google Authenticator, 1Password, Authy).
          </DialogDescription>
        </DialogHeader>
        {step === "start" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You'll scan a QR code, then enter the 6-digit code your app generates.
            </p>
          </div>
        )}
        {step === "verify" && (
          <div className="space-y-3">
            {qr && <img src={qr} alt="MFA QR code" className="mx-auto h-44 w-44" />}
            <p className="text-xs text-muted-foreground break-all">
              Or enter the secret manually: <code>{secret}</code>
            </p>
            <div>
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input id="mfa-code" inputMode="numeric" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
        )}
        <DialogFooter>
          {step === "start"
            ? <Button onClick={start} disabled={busy}>Start</Button>
            : <Button onClick={verify} disabled={busy || code.length !== 6}>Verify & enable</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}