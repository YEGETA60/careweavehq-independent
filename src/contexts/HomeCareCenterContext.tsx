import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { logAudit } from "@/lib/audit";
import { auditPhi } from "@/lib/phiAudit";

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  emergencyContact: string;
  careLevel: "Low" | "Medium" | "High";
  hourlyRate: number;
  status: "Active" | "Inactive";
  carePlan: string[];
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  hourlyWage: number;
  status: "Available" | "Assigned" | "Off-Duty";
  certifications: string[];
  user_id?: string | null;
}

export interface Visit {
  id: string;
  clientId: string;
  caregiverId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "Scheduled" | "In-Progress" | "Completed" | "Cancelled";
  notes?: string;
  tasksCompleted: string[];
  verifiedStartTime?: string;
  verifiedEndTime?: string;
  clockInLocation?: { lat: number; lng: number } | null;
  clockOutLocation?: { lat: number; lng: number } | null;
  verificationStatus?: "Unverified" | "Verified" | "Manual-Override" | "Flagged";
  verificationIssues?: string[];
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  dueDate: string;
  visits: string[];
  hours: number;
}

export interface IntakeForm {
  id: string;
  clientId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  representativeName: string;
  representativeRelation: string;
  representativePhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  primaryPhysician: string;
  physicianPhone: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
  careLevel: "Low" | "Medium" | "High";
  servicesRequested: string[];
  preferredSchedule: string;
  mobilityNeeds: string;
  dietaryRestrictions: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  billingNotes: string;
  consentCare: boolean;
  consentHipaa: boolean;
  consentBilling: boolean;
  clientSignature: string;
  clientSignedAt?: string;
  representativeSignature?: string;
  representativeSignedAt?: string;
  staffSignature?: string;
  staffSignedAt?: string;
  staffName?: string;
  status: "Draft" | "Signed" | "Archived";
  createdAt: string;
  updatedAt: string;
}

interface HomeCareContextType {
  clients: Client[];
  caregivers: Caregiver[];
  visits: Visit[];
  invoices: Invoice[];
  intakes: IntakeForm[];
  loading: boolean;
  refresh: () => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  addCaregiver: (caregiver: Omit<Caregiver, 'id'>) => Promise<void>;
  scheduleVisit: (visit: Omit<Visit, 'id'>) => Promise<void>;
  updateVisitStatus: (visitId: string, status: Visit['status'], notes?: string) => Promise<void>;
  updateVisit: (visitId: string, updates: Partial<Visit>) => Promise<void>;
  deleteVisit: (visitId: string) => Promise<void>;
  clockIn: (visitId: string, location?: { lat: number; lng: number } | null) => Promise<void>;
  clockOut: (visitId: string, location?: { lat: number; lng: number } | null, manualOverrideReason?: string) => Promise<void>;
  generateInvoice: (clientId: string, visitIds: string[]) => Promise<void>;
  getVerifiedHours: (visit: Visit) => number;
  getBillableVisits: () => Visit[];
  saveIntake: (intake: Omit<IntakeForm, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IntakeForm | undefined>;
  updateIntake: (id: string, updates: Partial<IntakeForm>) => Promise<void>;
  deleteIntake: (id: string) => Promise<void>;
  promoteIntakeToClient: (intakeId: string) => Promise<string | undefined>;
}

const HomeCareContext = createContext<HomeCareContextType | undefined>(undefined);

export function useHomeCareContext() {
  const context = useContext(HomeCareContext);
  if (!context) throw new Error('useHomeCareContext must be used within HomeCareProvider');
  return context;
}

// ---------- mappers ----------
const mapClient = (r: any): Client => ({
  id: r.id, name: r.name, address: r.address ?? "", phone: r.phone ?? "",
  emergencyContact: r.emergency_contact ?? "", careLevel: r.care_level,
  hourlyRate: Number(r.hourly_rate), status: r.status, carePlan: r.care_plan ?? [],
});
const mapCaregiver = (r: any): Caregiver => ({
  id: r.id, name: r.name, phone: r.phone ?? "", skills: r.skills ?? [],
  hourlyWage: Number(r.hourly_wage), status: r.status, certifications: r.certifications ?? [],
  user_id: r.user_id ?? null,
});
const mapVisit = (r: any): Visit => ({
  id: r.id, clientId: r.client_id, caregiverId: r.caregiver_id,
  date: r.date, startTime: r.start_time, endTime: r.end_time,
  status: r.status, notes: r.notes ?? undefined, tasksCompleted: r.tasks_completed ?? [],
  verifiedStartTime: r.verified_start_time ?? undefined,
  verifiedEndTime: r.verified_end_time ?? undefined,
  clockInLocation: r.clock_in_lat != null ? { lat: Number(r.clock_in_lat), lng: Number(r.clock_in_lng) } : null,
  clockOutLocation: r.clock_out_lat != null ? { lat: Number(r.clock_out_lat), lng: Number(r.clock_out_lng) } : null,
  verificationStatus: r.verification_status ?? "Unverified",
  verificationIssues: r.verification_issues ?? [],
});
const mapInvoice = (r: any): Invoice => ({
  id: r.id, clientId: r.client_id, amount: Number(r.amount),
  status: r.status, dueDate: r.due_date, visits: r.visit_ids ?? [], hours: Number(r.hours),
});
const mapIntake = (r: any): IntakeForm => ({
  id: r.id, clientId: r.client_id ?? undefined, ...r.data,
  status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
});

// ---------- helpers ----------
const parseTimeToMinutes = (time: string): number | null => {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const computeHours = (start?: string, end?: string): number => {
  const s = parseTimeToMinutes(start || "");
  const e = parseTimeToMinutes(end || "");
  if (s === null || e === null || e <= s) return 0;
  return (e - s) / 60;
};

export function HomeCareProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [intakes, setIntakes] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, cg, v, inv, it] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("caregivers").select("*").order("created_at", { ascending: false }),
      supabase.from("visits").select("*").order("date", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("intakes").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.data) setClients(c.data.map(mapClient));
    if (cg.data) setCaregivers(cg.data.map(mapCaregiver));
    if (v.data) setVisits(v.data.map(mapVisit));
    if (inv.data) setInvoices(inv.data.map(mapInvoice));
    if (it.data) setIntakes(it.data.map(mapIntake));
    setLoading(false);
    // PHI list-load audit (one entry per refresh, batched per entity)
    auditPhi({ action: "list", entity: "client",    metadata: { count: c.data?.length ?? 0 } });
    auditPhi({ action: "list", entity: "caregiver", metadata: { count: cg.data?.length ?? 0 } });
    auditPhi({ action: "list", entity: "visit",     metadata: { count: v.data?.length ?? 0 } });
    auditPhi({ action: "list", entity: "invoice",   metadata: { count: inv.data?.length ?? 0 } });
    auditPhi({ action: "list", entity: "intake",    metadata: { count: it.data?.length ?? 0 } });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    refresh();
  }, [user, authLoading, refresh]);

  // EVV computation
  const getVerifiedHours = (visit: Visit): number => {
    if (visit.status !== "Completed") return 0;
    if (visit.verificationStatus === "Verified" || visit.verificationStatus === "Manual-Override") {
      return computeHours(visit.verifiedStartTime || visit.startTime, visit.verifiedEndTime || visit.endTime);
    }
    return 0;
  };
  const getBillableVisits = () => visits.filter(v => getVerifiedHours(v) > 0);

  // ---------- CRUD ----------
  const addClient = async (c: Omit<Client, 'id'>) => {
    const { data, error } = await supabase.from("clients").insert({
      name: c.name, address: c.address, phone: c.phone, emergency_contact: c.emergencyContact,
      care_level: c.careLevel, hourly_rate: c.hourlyRate, status: c.status, care_plan: c.carePlan,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setClients(prev => [mapClient(data), ...prev]);
    logAudit("create", "client", data.id, { name: c.name });
    toast.success("Client added");
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const dbPatch: any = {};
    if (updates.name !== undefined) dbPatch.name = updates.name;
    if (updates.address !== undefined) dbPatch.address = updates.address;
    if (updates.phone !== undefined) dbPatch.phone = updates.phone;
    if (updates.emergencyContact !== undefined) dbPatch.emergency_contact = updates.emergencyContact;
    if (updates.careLevel !== undefined) dbPatch.care_level = updates.careLevel;
    if (updates.hourlyRate !== undefined) dbPatch.hourly_rate = updates.hourlyRate;
    if (updates.status !== undefined) dbPatch.status = updates.status;
    if (updates.carePlan !== undefined) dbPatch.care_plan = updates.carePlan;
    const { error } = await supabase.from("clients").update(dbPatch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    logAudit("update", "client", id, { fields: Object.keys(updates) });
    toast.success("Client updated");
  };

  const addCaregiver = async (c: Omit<Caregiver, 'id'>) => {
    const { data, error } = await supabase.from("caregivers").insert({
      name: c.name, phone: c.phone, skills: c.skills, hourly_wage: c.hourlyWage,
      status: c.status, certifications: c.certifications,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setCaregivers(prev => [mapCaregiver(data), ...prev]);
    logAudit("create", "caregiver", data.id, { name: c.name });
    toast.success("Caregiver added");
  };

  const scheduleVisit = async (v: Omit<Visit, 'id'>) => {
    const { data, error } = await supabase.from("visits").insert({
      client_id: v.clientId, caregiver_id: v.caregiverId, date: v.date,
      start_time: v.startTime, end_time: v.endTime, status: v.status,
      notes: v.notes, tasks_completed: v.tasksCompleted ?? [],
      verification_status: v.verificationStatus ?? "Unverified",
      verification_issues: v.verificationIssues ?? [],
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setVisits(prev => [mapVisit(data), ...prev]);
    logAudit("create", "visit", data.id);
    toast.success("Visit scheduled");
  };

  const recalculateInvoicesForVisit = async (visitId: string) => {
    const affected = invoices.filter(i => i.visits.includes(visitId) && i.status !== "Paid");
    for (const inv of affected) {
      const client = clients.find(c => c.id === inv.clientId);
      const stillBillable = inv.visits.filter(id => {
        const vv = visits.find(x => x.id === id);
        return vv ? getVerifiedHours(vv) > 0 : false;
      });
      const totalHours = stillBillable.reduce((s, id) => {
        const vv = visits.find(x => x.id === id)!;
        return s + getVerifiedHours(vv);
      }, 0);
      if (stillBillable.length === 0) {
        await supabase.from("invoices").delete().eq("id", inv.id);
      } else {
        await supabase.from("invoices").update({
          visit_ids: stillBillable,
          hours: +totalHours.toFixed(2),
          amount: client ? +(totalHours * client.hourlyRate).toFixed(2) : 0,
        }).eq("id", inv.id);
      }
    }
    if (affected.length) await refresh();
  };

  const updateVisitStatus = async (visitId: string, status: Visit['status'], notes?: string) => {
    const patch: any = { status };
    if (notes) patch.notes = notes;
    const { error } = await supabase.from("visits").update(patch).eq("id", visitId);
    if (error) { toast.error(error.message); return; }
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status, ...(notes && { notes }) } : v));
    logAudit("update_status", "visit", visitId, { status });
    if (status === "Cancelled") await recalculateInvoicesForVisit(visitId);
  };

  const updateVisit = async (visitId: string, updates: Partial<Visit>) => {
    const dbPatch: any = {};
    if (updates.clientId !== undefined) dbPatch.client_id = updates.clientId;
    if (updates.caregiverId !== undefined) dbPatch.caregiver_id = updates.caregiverId;
    if (updates.date !== undefined) dbPatch.date = updates.date;
    if (updates.startTime !== undefined) dbPatch.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbPatch.end_time = updates.endTime;
    if (updates.status !== undefined) dbPatch.status = updates.status;
    if (updates.notes !== undefined) dbPatch.notes = updates.notes;
    if (updates.tasksCompleted !== undefined) dbPatch.tasks_completed = updates.tasksCompleted;
    if (updates.verifiedStartTime !== undefined) dbPatch.verified_start_time = updates.verifiedStartTime;
    if (updates.verifiedEndTime !== undefined) dbPatch.verified_end_time = updates.verifiedEndTime;
    if (updates.verificationStatus !== undefined) dbPatch.verification_status = updates.verificationStatus;
    if (updates.verificationIssues !== undefined) dbPatch.verification_issues = updates.verificationIssues;
    const { error } = await supabase.from("visits").update(dbPatch).eq("id", visitId);
    if (error) { toast.error(error.message); return; }
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, ...updates } : v));
    logAudit("update", "visit", visitId);
    await recalculateInvoicesForVisit(visitId);
  };

  const deleteVisit = async (visitId: string) => {
    const onPaid = invoices.some(i => i.status === "Paid" && i.visits.includes(visitId));
    if (onPaid) { toast.error("Cannot delete: visit is on a paid invoice"); return; }
    const { error } = await supabase.from("visits").delete().eq("id", visitId);
    if (error) { toast.error(error.message); return; }
    setVisits(prev => prev.filter(v => v.id !== visitId));
    logAudit("delete", "visit", visitId);
    await recalculateInvoicesForVisit(visitId);
    toast.success("Visit deleted");
  };

  const clockIn = async (visitId: string, location?: { lat: number; lng: number } | null) => {
    const v = visits.find(x => x.id === visitId);
    if (!v) return;
    const issues = [...(v.verificationIssues ?? [])];
    const now = new Date();
    const verifiedStartTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (!location) issues.push("Clock-in: GPS unavailable");
    const sched = parseTimeToMinutes(v.startTime);
    const act = parseTimeToMinutes(verifiedStartTime);
    if (sched !== null && act !== null && act - sched > 15) issues.push(`Clock-in late by ${act - sched} min`);
    const status: Visit["verificationStatus"] = issues.length ? "Flagged" : "Verified";
    await supabase.from("visits").update({
      status: "In-Progress",
      verified_start_time: verifiedStartTime,
      clock_in_lat: location?.lat ?? null,
      clock_in_lng: location?.lng ?? null,
      verification_status: status,
      verification_issues: issues,
    }).eq("id", visitId);
    setVisits(prev => prev.map(x => x.id === visitId ? {
      ...x, status: "In-Progress", verifiedStartTime, clockInLocation: location ?? null,
      verificationStatus: status, verificationIssues: issues,
    } : x));
    logAudit("clock_in", "visit", visitId, { issues });
    issues.length ? toast.warning("Clock-in flagged", { description: issues.join("; ") }) : toast.success("Clock-in verified");
  };

  const clockOut = async (visitId: string, location?: { lat: number; lng: number } | null, manualOverrideReason?: string) => {
    const v = visits.find(x => x.id === visitId);
    if (!v) return;
    const issues = [...(v.verificationIssues ?? [])];
    const now = new Date();
    const verifiedEndTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (!location) issues.push("Clock-out: GPS unavailable");
    const schedEnd = parseTimeToMinutes(v.endTime);
    const actEnd = parseTimeToMinutes(verifiedEndTime);
    if (schedEnd !== null && actEnd !== null && Math.abs(actEnd - schedEnd) > 15) {
      issues.push(`Clock-out off-schedule by ${Math.abs(actEnd - schedEnd)} min`);
    }
    let status: Visit["verificationStatus"];
    if (manualOverrideReason) {
      status = "Manual-Override";
      issues.push(`Manual override: ${manualOverrideReason}`);
      toast.info("Visit manually verified", { description: manualOverrideReason });
    } else if (issues.length) {
      status = "Flagged";
      toast.warning("Clock-out flagged", { description: issues.join("; ") });
    } else {
      status = "Verified";
      toast.success("Visit verified");
    }
    await supabase.from("visits").update({
      status: "Completed",
      verified_end_time: verifiedEndTime,
      clock_out_lat: location?.lat ?? null,
      clock_out_lng: location?.lng ?? null,
      verification_status: status,
      verification_issues: issues,
    }).eq("id", visitId);
    setVisits(prev => prev.map(x => x.id === visitId ? {
      ...x, status: "Completed", verifiedEndTime, clockOutLocation: location ?? null,
      verificationStatus: status, verificationIssues: issues,
    } : x));
    logAudit("clock_out", "visit", visitId, { issues, manualOverrideReason });
  };

  const generateInvoice = async (clientId: string, visitIds: string[]) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const alreadyBilled = new Set(invoices.flatMap(i => i.visits));
    const eligible = visitIds.filter(id => {
      if (alreadyBilled.has(id)) return false;
      const v = visits.find(x => x.id === id);
      return v ? getVerifiedHours(v) > 0 : false;
    });
    if (!eligible.length) {
      toast.error("No billable visits", { description: "Visits must be Completed and Verified, and not already invoiced." });
      return;
    }
    const totalHours = eligible.reduce((s, id) => s + getVerifiedHours(visits.find(x => x.id === id)!), 0);
    const { data, error } = await supabase.from("invoices").insert({
      client_id: clientId,
      amount: +(totalHours * client.hourlyRate).toFixed(2),
      hours: +totalHours.toFixed(2),
      status: "Pending",
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      visit_ids: eligible,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setInvoices(prev => [mapInvoice(data), ...prev]);
    logAudit("create", "invoice", data.id, { amount: data.amount });
    toast.success(`Invoice created: $${Number(data.amount).toFixed(2)}`);
  };

  // ---------- Intakes ----------
  const saveIntake = async (intakeData: Omit<IntakeForm, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { id: _i, clientId, status, ...rest } = intakeData as any;
    const { data, error } = await supabase.from("intakes").insert({
      client_id: clientId ?? null,
      status: status ?? "Draft",
      data: rest,
    }).select().single();
    if (error) { toast.error(error.message); return undefined; }
    const mapped = mapIntake(data);
    setIntakes(prev => [mapped, ...prev]);
    logAudit("create", "intake", data.id);
    toast.success(mapped.status === "Signed" ? "Intake signed and saved" : "Intake saved as draft");
    return mapped;
  };

  const updateIntake = async (id: string, updates: Partial<IntakeForm>) => {
    const existing = intakes.find(i => i.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const { id: _x, clientId, status, createdAt, updatedAt, ...dataFields } = merged as any;
    const { error } = await supabase.from("intakes").update({
      client_id: clientId ?? null,
      status,
      data: dataFields,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setIntakes(prev => prev.map(i => i.id === id ? merged : i));
    logAudit("update", "intake", id);
  };

  const deleteIntake = async (id: string) => {
    const { error } = await supabase.from("intakes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setIntakes(prev => prev.filter(i => i.id !== id));
    logAudit("delete", "intake", id);
    toast.success("Intake deleted");
  };

  const promoteIntakeToClient = async (intakeId: string): Promise<string | undefined> => {
    const intake = intakes.find(i => i.id === intakeId);
    if (!intake) return undefined;
    if (intake.status !== "Signed") { toast.error("Intake must be signed before creating a client"); return undefined; }
    if (intake.clientId) { toast.info("Client already created from this intake"); return intake.clientId; }
    const { data, error } = await supabase.from("clients").insert({
      name: intake.fullName, address: intake.address, phone: intake.phone,
      emergency_contact: `${intake.emergencyContactName} - ${intake.emergencyContactPhone}`,
      care_level: intake.careLevel, hourly_rate: 25, status: "Active",
      care_plan: intake.servicesRequested,
    }).select().single();
    if (error) { toast.error(error.message); return undefined; }
    const newClient = mapClient(data);
    setClients(prev => [newClient, ...prev]);
    await supabase.from("intakes").update({ client_id: newClient.id }).eq("id", intakeId);
    setIntakes(prev => prev.map(i => i.id === intakeId ? { ...i, clientId: newClient.id } : i));
    logAudit("promote_intake", "client", newClient.id);
    toast.success(`Client profile created for ${intake.fullName}`);
    return newClient.id;
  };

  return (
    <HomeCareContext.Provider value={{
      clients, caregivers, visits, invoices, intakes, loading,
      refresh,
      addClient, updateClient, addCaregiver, scheduleVisit, updateVisitStatus, updateVisit, deleteVisit,
      clockIn, clockOut, getVerifiedHours, getBillableVisits, generateInvoice,
      saveIntake, updateIntake, deleteIntake, promoteIntakeToClient,
    }}>
      {children}
    </HomeCareContext.Provider>
  );
}
