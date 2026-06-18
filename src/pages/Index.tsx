import { useEffect, useRef, useState } from "react";
import Landing from "./Landing";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { DashboardOverview } from "@/components/DashboardOverview";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { ClientManagement } from "@/components/modules/ClientManagement";
import { CaregiverManagement } from "@/components/modules/CaregiverManagement";
import { SchedulingVisits } from "@/components/modules/SchedulingVisits";
import { BillingInvoicing } from "@/components/modules/BillingInvoicing";
import { PayrollPayments } from "@/components/modules/PayrollPayments";
import { ClientIntake } from "@/components/modules/ClientIntake";
import { SandataReports } from "@/components/modules/SandataReports";
import { UserAdmin } from "@/components/modules/UserAdmin";
import { WebAdmin } from "@/components/modules/WebAdmin";
import { PayersAuthorizations } from "@/components/modules/PayersAuthorizations";
import { CarePlans } from "@/components/modules/CarePlans";
import { VisitNotes } from "@/components/modules/VisitNotes";
import { Credentials } from "@/components/modules/Credentials";
import { RecurringVisits } from "@/components/modules/RecurringVisits";
import { CaregiverPortal } from "@/components/modules/CaregiverPortal";
import { FamilyPortal } from "@/components/modules/FamilyPortal";
import { Documents } from "@/components/modules/Documents";
import { ReportsAnalytics } from "@/components/modules/ReportsAnalytics";
import { Training } from "@/components/modules/Training";
import { HumanResources } from "@/components/modules/HumanResources";
import { ComplianceDashboard } from "@/components/modules/ComplianceDashboard";
import { Messages } from "@/components/modules/Messages";
import { LiveMap } from "@/components/modules/LiveMap";
import { CompanyProfile } from "@/components/modules/CompanyProfile";
import { SubscriptionTiersAdmin } from "@/components/modules/SubscriptionTiersAdmin";
import { Clinical } from "@/components/modules/Clinical";
import { SchedulingIntel } from "@/components/modules/SchedulingIntel";
import { RevenueCycle } from "@/components/modules/RevenueCycle";
import { AutoBilling } from "@/components/modules/AutoBilling";
import { ClaimSubmissions } from "@/components/modules/ClaimSubmissions";
import { BulkMigration } from "@/components/modules/BulkMigration";
import { StateAggregator } from "@/components/modules/StateAggregator";
import { OperationsManual } from "@/components/modules/OperationsManual";
import { Support } from "@/components/modules/Support";
import { SuperadminInbox } from "@/components/modules/SuperadminInbox";
import { CompanyOnboarding } from "@/components/CompanyOnboarding";
import { HomeCareProvider } from "@/contexts/HomeCareCenterContext";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { ModuleGate } from "@/components/ModuleGate";
import { TrialBanner } from "@/components/TrialBanner";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { TrialFeaturesCard } from "@/components/TrialFeaturesCard";
import { useSuperadminOverride } from "@/hooks/useSuperadminOverride";
import { AppFooter } from "@/components/AppFooter";
import { GuideTour } from "@/components/copilot/GuideTour";
import { useGuideProgress } from "@/components/copilot/useGuideProgress";
import { readProfile, recommendPath } from "@/components/copilot/personalization";
import { toast } from "sonner";

// Org hierarchy: Manager → Operations Manager → Supervisor → Caregiver.
// Managers and Operations Managers get broad oversight (everything except superadmin tools).
// Supervisors oversee scheduling, caregivers, visits, notes, credentials.
const OVERSIGHT: AppRole[] = ["admin", "manager", "operations_manager"];
const SUPERVISORY: AppRole[] = [...OVERSIGHT, "supervisor"];

const sectionRoles: Record<string, AppRole[]> = {
  dashboard: [...SUPERVISORY, "scheduler", "caregiver", "billing"],
  myvisits: [...SUPERVISORY, "caregiver"],
  family: ["family", "admin"],
  intake: [...SUPERVISORY, "scheduler"],
  clients: [...SUPERVISORY, "scheduler", "billing", "caregiver"],
  caregivers: [...SUPERVISORY, "scheduler", "billing"],
  scheduling: [...SUPERVISORY, "scheduler", "caregiver"],
  recurring: [...SUPERVISORY, "scheduler"],
  careplans: [...SUPERVISORY, "scheduler", "caregiver"],
  notes: [...SUPERVISORY, "scheduler", "caregiver"],
  credentials: [...SUPERVISORY, "scheduler", "caregiver"],
  clinical: [...SUPERVISORY, "scheduler", "caregiver"],
  schedintel: [...SUPERVISORY, "scheduler", "caregiver"],
  payers: [...OVERSIGHT, "scheduler", "billing"],
  billing: [...OVERSIGHT, "billing"],
  autobilling: [...OVERSIGHT, "billing"],
  revenue: [...OVERSIGHT, "billing"],
  claims837: [...OVERSIGHT, "billing"],
  payroll: [...OVERSIGHT, "billing"],
  documents: [...SUPERVISORY, "scheduler", "billing", "caregiver"],
  sandata: [...OVERSIGHT, "billing", "scheduler"],
  reports: [...OVERSIGHT, "billing"],
  users: ["admin"],
  training: [...SUPERVISORY, "scheduler", "caregiver", "billing"],
  hr: [...SUPERVISORY, "scheduler", "caregiver", "billing"],
  compliance: [...OVERSIGHT, "scheduler"],
  messages: [...SUPERVISORY, "scheduler", "caregiver", "billing"],
  livemap: [...SUPERVISORY, "scheduler", "billing"],
  company: [...SUPERVISORY, "scheduler", "caregiver", "billing"],
  tiers: ["superadmin"],
  webadmin: ["superadmin"],
  migrate: ["admin"],
  aggregator: [...OVERSIGHT, "billing"],
  manual: [...SUPERVISORY, "scheduler", "caregiver", "billing", "family"],
};

// Support is available to every authenticated role.
sectionRoles.support = [...SUPERVISORY, "scheduler", "caregiver", "billing", "family"];
sectionRoles.supportinbox = ["superadmin"];

const Index = () => {
  const { user, loading, hasAnyRole, hasRole, roles } = useAuth();
  const { isModuleUnlocked, isReadOnly } = useSubscription();
  const { overrideEnabled: superadminOverride } = useSuperadminOverride();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [maintenance, setMaintenance] = useState<{ on: boolean; msg: string | null }>({ on: false, msg: null });
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [tiersForOnboarding, setTiersForOnboarding] = useState<any[]>([]);
  const routedSuperadminRef = useRef(false);

  useEffect(() => {
    if (!loading && roles.includes("superadmin") && !routedSuperadminRef.current) {
      routedSuperadminRef.current = true;
      setActiveSection("webadmin");
    }
  }, [loading, roles]);

  // Honor ?module=<id>&ticket=<id> deep-links (e.g. from notification clicks).
  useEffect(() => {
    if (loading || !user) return;
    const params = new URLSearchParams(window.location.search);
    const moduleId = params.get("module");
    const ticketId = params.get("ticket");
    if (moduleId && sectionRoles[moduleId] && hasAnyRole(sectionRoles[moduleId])) {
      setActiveSection(moduleId);
      if (ticketId) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("cw:open-ticket", { detail: ticketId }));
        }, 80);
      }
    }
  }, [loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || !user) { setNeedsOnboarding(null); return; }
    (async () => {
      const { data: prof } = await (supabase as any)
        .from("profiles").select("onboarding_completed, default_company_id").eq("id", user.id).maybeSingle();
      const isSuperadmin = roles.includes("superadmin");
      const done = !!prof?.onboarding_completed && !!prof?.default_company_id;
      if (!done && !isSuperadmin) {
        const { data: ts } = await (supabase as any)
          .from("subscription_tiers").select("*").eq("active", true).order("sort_order");
        setTiersForOnboarding(ts ?? []);
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    })();
  }, [loading, user, roles]);

  useEffect(() => {
    if (loading || !user) return;
    (supabase as any).from("site_settings").select("maintenance_mode, maintenance_message").eq("id", 1).maybeSingle()
      .then(({ data }: { data: { maintenance_mode: boolean; maintenance_message: string | null } | null }) => {
        if (data) setMaintenance({ on: !!data.maintenance_mode, msg: data.maintenance_message });
      });
  }, [loading, user]);

  useEffect(() => {
    if (loading || roles.length === 0) return;
    if (!hasAnyRole(sectionRoles[activeSection] ?? [])) {
      const first = Object.keys(sectionRoles).find(s => hasAnyRole(sectionRoles[s]));
      if (first) setActiveSection(first);
    }
  }, [loading, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Allow components (e.g. AI Co-Pilot) to request a section change.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setActiveSection(detail);
    };
    window.addEventListener("cw:navigate", handler);
    return () => window.removeEventListener("cw:navigate", handler);
  }, []);

  // First-run guided-onboarding nudge: empty company + admin + not dismissed.
  const { state: guideState, dismissNudge, startTour } = useGuideProgress();
  const nudgeShownRef = useRef(false);
  useEffect(() => {
    if (loading || !user) return;
    if (nudgeShownRef.current) return;
    if (guideState.dismissedNudge) return;
    if (guideState.activeTourId) return;
    if (!hasAnyRole(["admin", "manager", "operations_manager"])) return;
    const anyCompleted = Object.values(guideState.tours ?? {}).some((t) => t?.completedAt);
    if (anyCompleted) return;
    (async () => {
      try {
        const { data: prof } = await (supabase as any)
          .from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
        const companyId = prof?.default_company_id;
        if (!companyId) return;
        const [clientsQ, caregiversQ, visitsQ] = await Promise.all([
          (supabase as any).from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          (supabase as any).from("caregivers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
          (supabase as any).from("visits").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        ]);
        const clients = clientsQ?.count ?? 0;
        const caregivers = caregiversQ?.count ?? 0;
        const visits = visitsQ?.count ?? 0;
        // If the workspace is fully set up, no nudge.
        if (clients > 0 && caregivers > 0 && visits > 0) return;
        nudgeShownRef.current = true;
        const userProfile = readProfile();
        const path = recommendPath(userProfile, { clients, caregivers, visits, invoices: 0 });
        const firstTour = path[0]?.tourId ?? "addFirstClient";
        if (!userProfile) {
          toast("Welcome! Want a walkthrough tailored to your role?", {
            duration: 14000,
            action: {
              label: "Personalize",
              onClick: () => {
                dismissNudge();
                window.dispatchEvent(new CustomEvent("cw:open-copilot-personalize"));
              },
            },
            cancel: {
              label: "Quick tour",
              onClick: () => { dismissNudge(); startTour(firstTour); },
            },
            onDismiss: () => dismissNudge(),
          });
        } else {
          toast(`Based on your role, let's start with: ${path[0]?.reason ?? "your next best step"}`, {
            duration: 14000,
            action: {
              label: "Start tour",
              onClick: () => { dismissNudge(); startTour(firstTour); },
            },
            onDismiss: () => dismissNudge(),
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [loading, user, guideState, hasAnyRole, dismissNudge, startTour]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Landing />;

  if (needsOnboarding === true) {
    return (
      <div className="min-h-screen">
        <div className="flex justify-end p-3 border-b">
          <button
            onClick={() => setNeedsOnboarding(false)}
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent"
          >
            Skip & enter app
          </button>
        </div>
        <CompanyOnboarding tiers={tiersForOnboarding} onComplete={() => setNeedsOnboarding(false)} />
      </div>
    );
  }

  if (maintenance.on && !hasAnyRole(["superadmin"])) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground">{maintenance.msg || "We'll be back shortly."}</p>
        </div>
      </div>
    );
  }

  const isSuperadmin = hasRole("superadmin");
  const allowed = (id: string) => isSuperadmin || hasAnyRole(sectionRoles[id] ?? []);
  const locked = (id: string) => !isModuleUnlocked(id);
  const goToUpgrade = () => setActiveSection("company");

  const renderContent = () => {
    if (!allowed(activeSection)) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Access restricted</h2>
          <p className="text-muted-foreground">
            {roles.length === 0
              ? "Your account has no role assigned yet. Ask an admin to grant you access."
              : "Your role does not have permission to view this module."}
          </p>
        </div>
      );
    }
    const view = (() => {
      switch (activeSection) {
      case "dashboard": return isSuperadmin ? <DashboardOverview /> : (
        <div className="space-y-4">
          <OnboardingWizard onNavigate={(s) => setActiveSection(s)} />
          <TrialFeaturesCard onChoosePlan={goToUpgrade} />
          <DashboardOverview />
        </div>
      );
      case "intake": return <ClientIntake />;
      case "clients": return <ClientManagement />;
      case "caregivers": return <CaregiverManagement />;
      case "scheduling": return <SchedulingVisits />;
      case "myvisits": return <CaregiverPortal />;
      case "family": return <FamilyPortal />;
      case "recurring": return <RecurringVisits />;
      case "careplans": return <CarePlans />;
      case "notes": return <VisitNotes />;
      case "credentials": return <Credentials />;
      case "clinical": return <Clinical />;
      case "schedintel": return <SchedulingIntel />;
      case "payers": return <PayersAuthorizations />;
      case "billing": return <BillingInvoicing />;
      case "autobilling": return <AutoBilling />;
      case "revenue": return <RevenueCycle />;
      case "claims837": return <ClaimSubmissions />;
      case "payroll": return <PayrollPayments />;
      case "documents": return <Documents />;
      case "sandata": return <SandataReports />;
      case "reports": return <ReportsAnalytics />;
      case "users": return <UserAdmin />;
      case "training": return <Training />;
      case "hr": return <HumanResources />;
      case "compliance": return <ComplianceDashboard />;
      case "messages": return <Messages />;
      case "livemap": return <LiveMap />;
      case "company": return <CompanyProfile />;
      case "tiers": return <SubscriptionTiersAdmin />;
      case "webadmin": return <WebAdmin />;
      case "migrate": return <BulkMigration />;
      case "aggregator": return <StateAggregator />;
      case "manual": return <OperationsManual />;
      case "support": return <Support />;
      case "supportinbox": return <SuperadminInbox />;
      default: return <DashboardOverview />;
      }
    })();
    const wrapped = <ModuleGate moduleId={activeSection} onUpgrade={goToUpgrade}>{view}</ModuleGate>;
    if (activeSection === "dashboard") return wrapped;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveSection("dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setActiveSection("dashboard")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {wrapped}
      </div>
    );
  };

  return (
    <HomeCareProvider>
      <div className="min-h-screen bg-background">
        {maintenance.on && hasAnyRole(["superadmin"]) && (
          <div className="bg-yellow-500/15 text-yellow-900 dark:text-yellow-200 text-center text-sm py-2 border-b border-yellow-500/30">
            Maintenance mode is ON — only superadmins can access the site.
          </div>
        )}
        <DashboardHeader onMenuClick={() => setNavOpen(true)} />
        <TrialBanner onUpgrade={goToUpgrade} />
        <ReadOnlyBanner onUpgrade={goToUpgrade} />
        <div className="flex">
          <DashboardNavigation
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            allowed={allowed}
            locked={locked}
            className="hidden md:block"
          />
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent side="left" className="p-0 w-72 max-w-[85vw]">
              <DashboardNavigation
                activeSection={activeSection}
                onSectionChange={(s) => { setActiveSection(s); setNavOpen(false); }}
                allowed={allowed}
                locked={locked}
                className="border-r-0 min-h-0"
              />
            </SheetContent>
          </Sheet>
          <main
            className={`flex-1 p-3 sm:p-4 md:p-6 min-w-0 overflow-x-auto ${
              isReadOnly && !superadminOverride && activeSection !== "company" ? "read-only-mode" : ""
            }`}
          >
            {renderContent()}
          </main>
        </div>
        <AppFooter />
      </div>
      <GuideTour />
    </HomeCareProvider>
  );
};

export default Index;
