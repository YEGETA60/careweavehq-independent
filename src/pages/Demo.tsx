import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";

export default function Demo() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    workEmail: "",
    agencyName: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(36_45%_96%)] via-[hsl(220_55%_96%)] to-[hsl(204_60%_97%)] text-foreground">
      <Helmet>
        <title>Book a Demo — CareWeaveHQ</title>
        <meta name="description" content="Book a 30-minute live demo with a CareWeaveHQ care-ops expert." />
      </Helmet>

      <header className="sticky top-0 z-30 backdrop-blur bg-[hsl(36_45%_96%/_0.85)] border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">CareWeaveHQ</Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <Link to="/features" className="hover:text-primary">Features</Link>
            <Link to="/pricing" className="hover:text-primary">Pricing</Link>
            <Link to="/resources" className="hover:text-primary">Resources</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm hover:text-primary hidden sm:inline px-2">Sign in</Link>
            <Button asChild className="rounded-full">
              <Link to="/signup">Start 45-day free trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-lg mx-auto">
          {!submitted ? (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 text-primary mb-4">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h1 className="font-display text-4xl font-semibold leading-tight">
                  Book a 30-Minute Live Demo
                </h1>
                <p className="mt-3 text-muted-foreground">
                  See CareWeaveHQ live with a care-ops expert.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-1.5">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Jane Smith"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>
                <div>
                  <label htmlFor="workEmail" className="block text-sm font-medium mb-1.5">
                    Work Email
                  </label>
                  <Input
                    id="workEmail"
                    name="workEmail"
                    type="email"
                    placeholder="jane@agency.com"
                    value={form.workEmail}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>
                <div>
                  <label htmlFor="agencyName" className="block text-sm font-medium mb-1.5">
                    Agency Name
                  </label>
                  <Input
                    id="agencyName"
                    name="agencyName"
                    type="text"
                    placeholder="Sunrise Home Care"
                    value={form.agencyName}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-full text-base">
                  Book my demo
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  No spam. We'll email you within one business day to confirm your time slot.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 mb-4">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h2 className="font-display text-3xl font-semibold">You're all set!</h2>
              <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                Thanks, {form.fullName || "there"}. We'll be in touch within one business day to confirm your demo time.
              </p>
              <Button asChild variant="outline" className="mt-6 rounded-full">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border/60 bg-[hsl(36_45%_94%)]">
        <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} CareWeaveHQ</div>
          <div>Crafted for home care teams who treat audit trails like a feature, not a chore.</div>
        </div>
      </footer>
    </div>
  );
}
