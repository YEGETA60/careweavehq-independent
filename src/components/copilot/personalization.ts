import { TOURS } from "./tours";

export type GuideRole =
  | "owner"
  | "admin"
  | "scheduler"
  | "billing"
  | "operations"
  | "other";

export type GuideGoal =
  | "onboard_clients"
  | "hire_caregivers"
  | "schedule_visits"
  | "bill_payers"
  | "compliance"
  | "explore";

export type GuideProfile = {
  role: GuideRole;
  goals: GuideGoal[];
  experience: "new" | "switching" | "expanding";
  savedAt: number;
};

export type StartingData = {
  clients: number;
  caregivers: number;
  visits: number;
  invoices: number;
};

export type RecommendedStep = {
  tourId: string;
  reason: string;
  priority: number;
};

export const ROLE_LABELS: Record<GuideRole, string> = {
  owner: "Owner",
  admin: "Admin",
  scheduler: "Scheduler",
  billing: "Billing / RCM",
  operations: "Operations / Supervisor",
  other: "Other",
};

export const GOAL_LABELS: Record<GuideGoal, string> = {
  onboard_clients: "Onboard new clients",
  hire_caregivers: "Hire & credential caregivers",
  schedule_visits: "Schedule & track visits",
  bill_payers: "Bill payers / run invoices",
  compliance: "Stay EVV / compliance ready",
  explore: "Just exploring",
};

/** Heuristic recommender. Combines role, goals, and starting data into an ordered
 *  list of tour ids. Tours the user already implicitly completed (data present) are
 *  deprioritized rather than removed, so they still appear at the bottom. */
export function recommendPath(
  profile: GuideProfile | null,
  data: StartingData
): RecommendedStep[] {
  const score: Record<string, { score: number; reasons: string[] }> = {
    addFirstClient: { score: 0, reasons: [] },
    addFirstCaregiver: { score: 0, reasons: [] },
    scheduleFirstVisit: { score: 0, reasons: [] },
    runFirstInvoice: { score: 0, reasons: [] },
  };

  // Base ordering from the natural workflow.
  score.addFirstClient.score += 40;
  score.addFirstCaregiver.score += 30;
  score.scheduleFirstVisit.score += 20;
  score.runFirstInvoice.score += 10;

  // Starting data: if you already have N of something, drop its priority sharply.
  if (data.clients > 0) {
    score.addFirstClient.score -= 50;
    score.addFirstClient.reasons.push(`You already have ${data.clients} client${data.clients === 1 ? "" : "s"}.`);
  } else {
    score.addFirstClient.reasons.push("You have no clients yet — start here.");
  }
  if (data.caregivers > 0) {
    score.addFirstCaregiver.score -= 50;
    score.addFirstCaregiver.reasons.push(`You already have ${data.caregivers} caregiver${data.caregivers === 1 ? "" : "s"}.`);
  } else {
    score.addFirstCaregiver.reasons.push("No caregivers on file yet.");
  }
  if (data.visits > 0) {
    score.scheduleFirstVisit.score -= 40;
    score.scheduleFirstVisit.reasons.push(`${data.visits} visit${data.visits === 1 ? "" : "s"} already scheduled.`);
  }
  if (data.invoices > 0) {
    score.runFirstInvoice.score -= 40;
    score.runFirstInvoice.reasons.push(`${data.invoices} invoice${data.invoices === 1 ? "" : "s"} on file.`);
  }

  // Role boosts.
  if (profile) {
    if (profile.role === "scheduler") {
      score.scheduleFirstVisit.score += 35;
      score.scheduleFirstVisit.reasons.push("Schedulers usually start here.");
    }
    if (profile.role === "billing") {
      score.runFirstInvoice.score += 40;
      score.runFirstInvoice.reasons.push("Billing roles usually start with invoicing.");
    }
    if (profile.role === "operations") {
      score.addFirstCaregiver.score += 15;
      score.scheduleFirstVisit.score += 10;
    }
    if (profile.role === "owner" || profile.role === "admin") {
      score.addFirstClient.score += 10;
    }

    // Goals.
    if (profile.goals.includes("onboard_clients")) score.addFirstClient.score += 20;
    if (profile.goals.includes("hire_caregivers")) score.addFirstCaregiver.score += 20;
    if (profile.goals.includes("schedule_visits")) score.scheduleFirstVisit.score += 20;
    if (profile.goals.includes("bill_payers")) score.runFirstInvoice.score += 25;

    // Switching from another EVV system means data probably exists — focus on billing/compliance.
    if (profile.experience === "switching") {
      score.runFirstInvoice.score += 15;
      score.runFirstInvoice.reasons.push("You're switching systems — confirm billing works end-to-end.");
    }
    if (profile.experience === "new") {
      score.addFirstClient.score += 10;
    }
  }

  // Build ordered list, keep only tours we actually know about.
  const known = new Set(TOURS.map((t) => t.id));
  return Object.entries(score)
    .filter(([id]) => known.has(id))
    .map<RecommendedStep>(([tourId, v]) => ({
      tourId,
      reason: v.reasons[0] ?? "Recommended for your setup.",
      priority: v.score,
    }))
    .sort((a, b) => b.priority - a.priority);
}

const PROFILE_KEY = "cw:onboarding:profile:v1";

export function readProfile(): GuideProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as GuideProfile) : null;
  } catch {
    return null;
  }
}

export function writeProfile(p: GuideProfile) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("cw:onboarding-profile-changed"));
  } catch {
    /* ignore */
  }
}

export function clearProfile() {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new CustomEvent("cw:onboarding-profile-changed"));
  } catch {
    /* ignore */
  }
}