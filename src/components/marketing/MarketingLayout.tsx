import { ReactNode, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MarketingLayoutProps {
  title: string;
  description: string;
  canonicalPath: string;
  children: ReactNode;
}

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  
  { to: "/private-pay", label: "Private Pay" },
  { to: "/resources", label: "Resources" },
];

export function MarketingLayout({ title, description, canonicalPath, children }: MarketingLayoutProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[hsl(36_45%_96%)] text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://careweavehq.com${canonicalPath}`} />
      </Helmet>

      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[hsl(36_45%_96%/_0.85)] border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl md:text-2xl font-bold tracking-tight shrink-0">
            CareWeaveHQ
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-full transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-foreground/80 hover:text-primary hover:bg-foreground/[0.04]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-sm font-medium text-foreground/80 hover:text-primary px-3 py-2 rounded-full transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              Start 45-day free trial
            </Link>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-9 w-9 -mr-1"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] max-w-sm bg-[hsl(36_45%_96%)] border-l border-border/60">
                <div className="flex items-center justify-between mb-8">
                  <span className="font-display text-xl font-bold">CareWeaveHQ</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `px-3 py-3 rounded-lg text-base font-medium ${
                          isActive ? "text-primary bg-primary/10" : "text-foreground hover:bg-foreground/[0.04]"
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-8 pt-6 border-t border-border/60 flex flex-col gap-2">
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-foreground/[0.04]"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-primary text-primary-foreground px-4 py-3 text-base font-medium text-center hover:opacity-90"
                  >
                    Start 45-day free trial
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 bg-[hsl(36_45%_94%)] mt-20">
        <div className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="font-display text-2xl font-bold">CareWeaveHQ</div>
            <p className="mt-3 text-muted-foreground">
              A single fabric for Medicaid, Medicare, HCBS, and private-pay home care.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/features" className="hover:text-primary">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-primary">Pricing</Link></li>
              <li><Link to="/resources" className="hover:text-primary">Resources</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Solutions</div>
            <ul className="space-y-2 text-muted-foreground">
              
              <li><Link to="/private-pay" className="hover:text-primary">Private Pay</Link></li>
              
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Legal</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/legal/terms" className="hover:text-primary">Terms</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-primary">Privacy</Link></li>
              <li><Link to="/legal/hipaa" className="hover:text-primary">HIPAA</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} CareWeaveHQ</div>
            <div>Crafted for home care teams who treat audit trails like a feature, not a chore.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}