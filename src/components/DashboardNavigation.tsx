import { useState } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  FileText,
  DollarSign,
  CreditCard,
  BarChart3,
  Home,
  ClipboardList,
  FileSpreadsheet,
  ShieldCheck,
  FileCheck2,
  Award,
  Repeat,
  Shield,
  Smartphone,
  Heart,
  Folder,
  Wrench,
  GraduationCap,
  Briefcase,
  MessageSquare,
  Map as MapIcon,
  Building2,
  Tag,
  Stethoscope,
  Sparkles,
  Receipt,
  Zap,
  ChevronDown,
  Database,
  Lock,
  Network,
  BookOpen,
  LifeBuoy,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const allItems: Record<string, NavItem> = {
  dashboard: { id: "dashboard", label: "Dashboard", icon: Home, description: "Overview & Analytics" },
  myvisits: { id: "myvisits", label: "My Visits", icon: Smartphone, description: "Caregiver mobile portal" },
  family: { id: "family", label: "Family Portal", icon: Heart, description: "Care updates for family" },
  intake: { id: "intake", label: "Client Intake", icon: ClipboardList, description: "Forms, consents & e-signatures" },
  clients: { id: "clients", label: "Client Profiles", icon: Users, description: "Client profiles & demographics" },
  caregivers: { id: "caregivers", label: "Caregiver Profiles", icon: UserCheck, description: "Staff profiles & credentials" },
  scheduling: { id: "scheduling", label: "Scheduling & Visits", icon: Calendar, description: "Visit management & EVV" },
  recurring: { id: "recurring", label: "Recurring Visits", icon: Repeat, description: "Weekly/biweekly schedules" },
  careplans: { id: "careplans", label: "Care Plans", icon: FileCheck2, description: "Plan of care per client" },
  notes: { id: "notes", label: "Visit Notes", icon: FileText, description: "SOAP notes & incidents" },
  credentials: { id: "credentials", label: "Credentials", icon: Award, description: "Caregiver licenses & expirations" },
  clinical: { id: "clinical", label: "Clinical", icon: Stethoscope, description: "eMAR, vitals, ADLs, incidents, assessments" },
  schedintel: { id: "schedintel", label: "Scheduling Intel", icon: Sparkles, description: "Open shifts, availability, OT forecast, geofence" },
  payers: { id: "payers", label: "Payers & Auths", icon: ShieldCheck, description: "Insurance & authorizations" },
  billing: { id: "billing", label: "Billing & Invoicing", icon: DollarSign, description: "Client billing & payments" },
  autobilling: { id: "autobilling", label: "Auto Billing", icon: Zap, description: "One-click weekly billing run" },
  revenue: { id: "revenue", label: "Revenue Cycle", icon: Receipt, description: "Claims, remits, denials, aging, rate sheets" },
  claims837: { id: "claims837", label: "837P Claims", icon: FileCheck2, description: "Generate, validate & submit X12 837P to clearinghouse" },
  payroll: { id: "payroll", label: "Payroll & Payments", icon: CreditCard, description: "Caregiver compensation" },
  documents: { id: "documents", label: "Documents", icon: Folder, description: "Secure file storage" },
  sandata: { id: "sandata", label: "Sandata Reports", icon: FileSpreadsheet, description: "Import & reconcile EVV reports" },
  reports: { id: "reports", label: "Reports & Analytics", icon: BarChart3, description: "Business intelligence" },
  users: { id: "users", label: "Users & Roles", icon: Shield, description: "Admin staff access" },
  training: { id: "training", label: "Learning Home", icon: GraduationCap, description: "HIPAA & compliance training" },
  hr: { id: "hr", label: "HR", icon: Briefcase, description: "Employment, PTO, reviews & onboarding" },
  compliance: { id: "compliance", label: "Compliance Dashboard", icon: ShieldCheck, description: "Expiring credentials & overdue training" },
  messages: { id: "messages", label: "Messages", icon: MessageSquare, description: "Direct chat with your team" },
  livemap: { id: "livemap", label: "Live Map", icon: MapIcon, description: "Caregivers checked in today" },
  company: { id: "company", label: "Company Profile", icon: Building2, description: "Legal info, settings & subscription" },
  tiers: { id: "tiers", label: "Subscription Tiers", icon: Tag, description: "Manage plans & pricing" },
  webadmin: { id: "webadmin", label: "Web Admin", icon: Wrench, description: "Maintenance, config & performance" },
  migrate: { id: "migrate", label: "Bulk Migration", icon: Database, description: "Import existing roster from Excel/CSV" },
  aggregator: { id: "aggregator", label: "State Aggregator", icon: Network, description: "Send EVV visits to HHAeXchange / Sandata" },
  manual: { id: "manual", label: "Operations Manual", icon: BookOpen, description: "Training, reference & troubleshooting" },
  support: { id: "support", label: "Support", icon: LifeBuoy, description: "Open tickets — no PHI in general support" },
  supportinbox: { id: "supportinbox", label: "Support Inbox", icon: Inbox, description: "Cross-agency tickets (superadmin only)" },
};

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: string[];
}

const navStructure: (string | NavGroup)[] = [
  "dashboard",
  "myvisits",
  "family",
  {
    id: "client-mgmt",
    label: "Client Management",
    icon: Users,
    children: ["clients", "intake", "careplans", "payers"],
  },
  {
    id: "caregiver-mgmt",
    label: "Caregiver Management",
    icon: UserCheck,
    children: ["caregivers", "credentials", "compliance", "hr", "training"],
  },
  {
    id: "scheduling-grp",
    label: "Scheduling & Visits",
    icon: Calendar,
    children: ["scheduling", "recurring", "notes", "schedintel", "clinical", "livemap"],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    children: ["autobilling", "billing", "revenue", "claims837", "payroll", "sandata"],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Network,
    children: ["aggregator"],
  },
  {
    id: "docs-reports",
    label: "Documents & Reports",
    icon: Folder,
    children: ["documents", "reports"],
  },
  "messages",
  "manual",
  "support",
  {
    id: "admin",
    label: "Administration",
    icon: Shield,
    children: ["users", "company", "tiers", "webadmin"],
  },
  {
    id: "superadmin",
    label: "Superadmin",
    icon: Shield,
    children: ["supportinbox"],
  },
  {
    id: "data",
    label: "Data",
    icon: Database,
    children: ["migrate"],
  },
];

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  allowed?: (id: string) => boolean;
  locked?: (id: string) => boolean;
  className?: string;
}

export function DashboardNavigation({ activeSection, onSectionChange, allowed, locked, className }: DashboardNavigationProps) {
  const isAllowed = (id: string) => (allowed ? allowed(id) : true);
  const isLocked = (id: string) => (locked ? locked(id) : false);

  const initialOpen: Record<string, boolean> = {};
  for (const entry of navStructure) {
    if (typeof entry !== "string") {
      initialOpen[entry.id] = entry.children.includes(activeSection) || true;
    }
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);
  const toggleGroup = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const renderItem = (id: string, indent = false) => {
    const item = allItems[id];
    if (!item || !isAllowed(id)) return null;
    const Icon = item.icon;
    const isActive = activeSection === id;
    const lockedItem = isLocked(id);
    return (
      <button
        key={id}
        onClick={() => onSectionChange(id)}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group",
          indent && "pl-9",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg"
            : "hover:bg-muted text-foreground",
          lockedItem && !isActive && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Icon
            className={cn(
              "h-5 w-5 mt-0.5 shrink-0 transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <div className="flex-1 min-w-0 leading-tight">
            <p
              className={cn(
                "font-medium text-sm flex items-center gap-1.5 break-words",
                isActive ? "text-primary-foreground" : "text-foreground"
              )}
            >
              <span className="break-words">{item.label}</span>
              {lockedItem && (
                <Lock
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                />
              )}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5 break-words leading-snug",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground"
              )}
            >
              {item.description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <nav className={cn("bg-card border-r border-border w-72 min-h-screen", className)}>
      <div className="p-4 md:p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Core Modules
        </h2>
        <div className="space-y-2">
          {navStructure.map((entry) => {
            if (typeof entry === "string") return renderItem(entry);
            const visibleChildren = entry.children.filter(isAllowed);
            if (visibleChildren.length === 0) return null;
            const Icon = entry.icon;
            const isOpen = openGroups[entry.id] ?? true;
            const containsActive = entry.children.includes(activeSection);
            return (
              <div key={entry.id}>
                <button
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-between gap-2 min-w-0",
                    containsActive ? "bg-muted text-foreground" : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="font-semibold text-sm break-words">{entry.label}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {visibleChildren.map((c) => renderItem(c, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}