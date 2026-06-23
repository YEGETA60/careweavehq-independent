import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import coverHero from "@/assets/cover-hero.jpg";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().max(100).optional(),
});

const phoneSchema = z.object({
  phone: z.string().trim().regex(/^\+?[1-9]\d{6,14}$/, "Use international format e.g. +15551234567"),
  otp: z.string().trim().regex(/^\d{6}$/).optional(),
});

type AuthProps = {
  initialMode?: "login" | "signup";
  initialForgotOpen?: boolean;
};

export default function Auth({ initialMode = "login", initialForgotOpen = false }: AuthProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  // email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // phone
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(initialForgotOpen);
  const [forgotEmail, setForgotEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [showIframeNotice, setShowIframeNotice] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  const handleEmail = async () => {
    const parsed = emailSchema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (mode === "signup" && !termsAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy to create an account.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              terms_accepted_at: new Date().toISOString(),
              terms_version: "2026-05-09",
            },
          },
        });
        if (error) throw error;
        const newUser = data.user;
        const hasSession = !!data.session;
        // Supabase returns a user with empty identities array when the email
        // is already registered (anti-enumeration). Detect that case.
        const looksLikeExistingUser =
          !!newUser && Array.isArray((newUser as any).identities) && (newUser as any).identities.length === 0;

        if (looksLikeExistingUser) {
          toast.info("That email is already registered. Try signing in, or use “Forgot password”.");
          setMode("login");
          return;
        }

        if (newUser?.email && hasSession) {
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "welcome",
              recipientEmail: newUser.email,
              idempotencyKey: `welcome-${newUser.id}`,
              templateData: { name: fullName || undefined },
            },
          }).catch(() => {});
        }
        if (hasSession) {
          toast.success("Account created. You're signed in.");
        } else {
          toast.success(
            "Account created! Check your inbox and click the confirmation link to activate your account before signing in.",
            { duration: 10000 },
          );
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/email not confirmed/i.test(error.message)) {
            toast.error("Please confirm your email first — check your inbox for the confirmation link.");
            return;
          }
          throw error;
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (inIframe) {
      setShowIframeNotice(true);
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    const parsed = phoneSchema.safeParse({ phone });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("Code sent via SMS");
  };

  const handleVerifyOtp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setBusy(false);
    if (error) return toast.error(error.message);
  };

  const handleForgotPassword = async () => {
    const parsed = z.string().email().safeParse(forgotEmail.trim());
    if (!parsed.success) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("If that email exists, a reset link has been sent.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="relative h-40 sm:h-56 lg:h-auto lg:block overflow-hidden">
        <img
          src={coverHero}
          alt="Caregiver supporting an elderly woman with warmth and care"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/70 via-primary/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 lg:p-10 text-primary-foreground">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-background/20 backdrop-blur rounded-xl flex items-center justify-center font-bold text-sm">CW</div>
            <span className="text-base sm:text-lg font-semibold tracking-tight">CareWeaveHQ</span>
          </div>
          <div className="space-y-2 lg:space-y-4 max-w-md">
            <h1 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold leading-tight">Care that connects, software that delivers.</h1>
            <p className="hidden lg:block text-base xl:text-lg text-primary-foreground/90">
              The all-in-one home care platform — scheduling, EVV, billing, payroll and family communication, beautifully unified.
            </p>
            <div className="hidden sm:flex flex-wrap gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-background/15 backdrop-blur">EVV Verified</span>
              <span className="px-3 py-1 rounded-full bg-background/15 backdrop-blur">HIPAA Ready</span>
              <span className="px-3 py-1 rounded-full bg-background/15 backdrop-blur">Family Portal</span>
            </div>
          </div>
          <p className="hidden lg:block text-xs text-primary-foreground/70">© {new Date().getFullYear()} CareWeaveHQ — Compassion, organized.</p>
        </div>
      </aside>
      <main className="flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            CareWeaveHQ
            <span className="px-2 py-0.5 rounded-full bg-background/15 backdrop-blur text-xs">Beta</span>
          </CardTitle>
          <CardDescription>CareWeaveHQ is in Beta — create your free testing account. Please don't enter real patient information (PHI) until our compliance setup is complete.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-3 mt-4">
              <div className="flex gap-2 text-sm">
                <button onClick={() => setMode("login")} className={mode === "login" ? "font-semibold underline" : "text-muted-foreground"}>Sign in</button>
                <span className="text-muted-foreground">·</span>
                <button onClick={() => setMode("signup")} className={mode === "signup" ? "font-semibold underline" : "text-muted-foreground"}>Create account</button>
              </div>
              {mode === "signup" && (
                <div className="space-y-1">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link to="/legal/terms" target="_blank" className="underline text-foreground">Terms of Service</Link>,{" "}
                    <Link to="/legal/privacy" target="_blank" className="underline text-foreground">Privacy Policy</Link>, and{" "}
                    <Link to="/legal/hipaa" target="_blank" className="underline text-foreground">HIPAA Notice</Link>.
                    I confirm I am authorized to bind my organization and will not upload Protected Health Information until a Business Associate Agreement is in place.
                  </span>
                </label>
              )}
              <Button onClick={handleEmail} disabled={busy} className="w-full">
                {mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => { setForgotOpen((v) => !v); setForgotEmail(email); }}
                className="w-full text-sm"
              >
                {mode === "signup" ? "Already have an account? Reset password" : "Forgot your password?"}
              </Button>
              {forgotOpen && (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="forgotEmail">Email for password reset</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <Button onClick={handleForgotPassword} disabled={busy} className="w-full" variant="secondary">
                    Send reset link
                  </Button>
                </div>
              )}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleGoogle} disabled={busy} className="w-full">
                Continue with Google
              </Button>
              {showIframeNotice && inIframe && (
                <Alert>
                  <AlertDescription className="text-xs space-y-2">
                    <p>
                      Google sign-in can't be used inside the editor preview because Google blocks its login page from loading in iframes.
                    </p>
                    <a
                      href={typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline text-foreground"
                    >
                      Open sign-in in a new tab <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="phone" className="space-y-3 mt-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone (international, e.g. +15551234567)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} />
              </div>
              {!otpSent ? (
                <Button onClick={handleSendOtp} disabled={busy} className="w-full">Send code</Button>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="otp">6-digit code</Label>
                    <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" />
                  </div>
                  <Button onClick={handleVerifyOtp} disabled={busy} className="w-full">Verify</Button>
                  <button className="text-xs text-muted-foreground underline" onClick={() => { setOtpSent(false); setOtp(""); }}>Use a different number</button>
                </>
              )}
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
            By continuing you agree to our{" "}
            <Link to="/legal/terms" className="underline">Terms</Link>,{" "}
            <Link to="/legal/privacy" className="underline">Privacy Policy</Link>, and{" "}
            <Link to="/legal/hipaa" className="underline">HIPAA Notice</Link>.
            This platform is administrative software and is not a substitute for clinical judgment.
          </p>
        </CardContent>
        </Card>
      </main>
    </div>
  );
}
