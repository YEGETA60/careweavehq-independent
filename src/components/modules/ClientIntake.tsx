import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardList, FileSignature, Plus, Printer, Trash2, UserPlus, Eye } from "lucide-react";
import { toast } from "sonner";
import { useHomeCareContext, IntakeForm } from "@/contexts/HomeCareCenterContext";
import { SignaturePad } from "@/components/SignaturePad";
import { printPage } from "@/lib/print-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntakePacket } from "@/components/IntakePacket";

const SERVICE_OPTIONS = [
  "Personal Care",
  "Medication Reminders",
  "Medication Management",
  "Mobility Assistance",
  "Meal Preparation",
  "Light Housekeeping",
  "Companionship",
  "Dementia Care",
  "Transportation",
  "Respite Care",
];

type FormState = Omit<IntakeForm, "id" | "createdAt" | "updatedAt" | "status" | "clientId">;

const emptyForm: FormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  phone: "",
  email: "",
  representativeName: "",
  representativeRelation: "",
  representativePhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  primaryPhysician: "",
  physicianPhone: "",
  allergies: "",
  medications: "",
  medicalConditions: "",
  careLevel: "Medium",
  servicesRequested: [],
  preferredSchedule: "",
  mobilityNeeds: "",
  dietaryRestrictions: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  billingNotes: "",
  consentCare: false,
  consentHipaa: false,
  consentBilling: false,
  clientSignature: "",
  representativeSignature: "",
  staffSignature: "",
  staffName: "",
};

const intakeSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().trim().min(3, "Address is required").max(200),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
  emergencyContactName: z.string().trim().min(2, "Emergency contact required").max(100),
  emergencyContactPhone: z.string().trim().min(7, "Emergency phone required").max(30),
  consentCare: z.literal(true, { errorMap: () => ({ message: "Care consent required" }) }),
  consentHipaa: z.literal(true, { errorMap: () => ({ message: "HIPAA consent required" }) }),
  consentBilling: z.literal(true, { errorMap: () => ({ message: "Billing consent required" }) }),
  clientSignature: z.string().min(20, "Client/representative signature required"),
});

export function ClientIntake() {
  const { intakes, saveIntake, deleteIntake, promoteIntakeToClient } = useHomeCareContext();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<IntakeForm | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleService = (svc: string) => {
    setForm(prev => ({
      ...prev,
      servicesRequested: prev.servicesRequested.includes(svc)
        ? prev.servicesRequested.filter(s => s !== svc)
        : [...prev.servicesRequested, svc],
    }));
  };

  const handleSave = (asSigned: boolean) => {
    if (asSigned) {
      const result = intakeSchema.safeParse(form);
      if (!result.success) {
        toast.error("Please complete required fields", {
          description: result.error.issues[0]?.message,
        });
        return;
      }
    } else if (!form.fullName.trim()) {
      toast.error("Client name is required to save a draft");
      return;
    }
    const now = new Date().toISOString();
    saveIntake({
      ...form,
      status: asSigned ? "Signed" : "Draft",
      clientSignedAt: asSigned && form.clientSignature ? now : undefined,
      representativeSignedAt:
        asSigned && form.representativeSignature ? now : undefined,
      staffSignedAt: asSigned && form.staffSignature ? now : undefined,
    });
    setForm(emptyForm);
    setOpen(false);
  };

  const handlePrint = (intake: IntakeForm) => {
    setViewing(intake);
    setTimeout(() => printPage(), 250);
  };

  const sortedIntakes = useMemo(
    () => [...intakes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [intakes]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <ClipboardList className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Intake & Signing</h1>
            <p className="text-muted-foreground">
              Capture client information, consents, and signatures
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Intake
        </Button>
      </div>

      <Tabs defaultValue="intakes" className="no-print">
        <TabsList>
          <TabsTrigger value="intakes">Intakes</TabsTrigger>
          <TabsTrigger value="packet">Information Packet</TabsTrigger>
        </TabsList>
        <TabsContent value="intakes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedIntakes.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              No intakes yet. Click "New Intake" to create one.
            </CardContent>
          </Card>
        )}
        {sortedIntakes.map(intake => (
          <Card key={intake.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{intake.fullName || "Untitled"}</CardTitle>
                  <CardDescription>
                    {new Date(intake.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    intake.status === "Signed"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  }
                >
                  {intake.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">{intake.phone}</div>
              <div className="text-muted-foreground">{intake.address}</div>
              <div>
                <span className="font-medium">Care level:</span> {intake.careLevel}
              </div>
              <div>
                <span className="font-medium">Services:</span>{" "}
                {intake.servicesRequested.join(", ") || "—"}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => setViewing(intake)}>
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                <Button size="sm" variant="outline" onClick={() => handlePrint(intake)}>
                  <Printer className="h-3 w-3 mr-1" /> Print
                </Button>
                {intake.status === "Signed" && !intake.clientId && (
                  <Button size="sm" onClick={() => promoteIntakeToClient(intake.id)}>
                    <UserPlus className="h-3 w-3 mr-1" /> Create Client
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Delete this intake?")) deleteIntake(intake.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>
        </TabsContent>
        <TabsContent value="packet" className="mt-4">
          <IntakePacket />
        </TabsContent>
      </Tabs>

      {/* New intake dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Client Intake Form</DialogTitle>
          </DialogHeader>
          <IntakeFormFields form={form} update={update} toggleService={toggleService} />
          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => handleSave(false)}>
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)}>
              <FileSignature className="h-4 w-4 mr-2" /> Save & Sign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View / Print dialog */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          {viewing && <IntakePrintable intake={viewing} />}
          <div className="flex justify-end gap-2 pt-4 border-t no-print">
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            <Button onClick={printPage}>
              <Printer className="h-4 w-4 mr-2" /> Print Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntakeFormFields({
  form,
  update,
  toggleService,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleService: (svc: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Personal Information">
        <Field label="Full Name *">
          <Input value={form.fullName} maxLength={100} onChange={e => update("fullName", e.target.value)} />
        </Field>
        <Field label="Date of Birth *">
          <Input type="date" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Gender">
          <Input value={form.gender} maxLength={50} onChange={e => update("gender", e.target.value)} />
        </Field>
        <Field label="Phone *">
          <Input value={form.phone} maxLength={30} onChange={e => update("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} maxLength={255} onChange={e => update("email", e.target.value)} />
        </Field>
        <Field label="Address *" className="md:col-span-2">
          <Input value={form.address} maxLength={200} onChange={e => update("address", e.target.value)} />
        </Field>
      </Section>

      <Section title="Representative (optional)">
        <Field label="Name">
          <Input value={form.representativeName} maxLength={100} onChange={e => update("representativeName", e.target.value)} />
        </Field>
        <Field label="Relationship">
          <Input value={form.representativeRelation} maxLength={50} onChange={e => update("representativeRelation", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.representativePhone} maxLength={30} onChange={e => update("representativePhone", e.target.value)} />
        </Field>
      </Section>

      <Section title="Emergency Contact">
        <Field label="Name *">
          <Input value={form.emergencyContactName} maxLength={100} onChange={e => update("emergencyContactName", e.target.value)} />
        </Field>
        <Field label="Phone *">
          <Input value={form.emergencyContactPhone} maxLength={30} onChange={e => update("emergencyContactPhone", e.target.value)} />
        </Field>
      </Section>

      <Section title="Medical">
        <Field label="Primary Physician">
          <Input value={form.primaryPhysician} maxLength={100} onChange={e => update("primaryPhysician", e.target.value)} />
        </Field>
        <Field label="Physician Phone">
          <Input value={form.physicianPhone} maxLength={30} onChange={e => update("physicianPhone", e.target.value)} />
        </Field>
        <Field label="Allergies" className="md:col-span-2">
          <Textarea value={form.allergies} maxLength={500} onChange={e => update("allergies", e.target.value)} />
        </Field>
        <Field label="Current Medications" className="md:col-span-2">
          <Textarea value={form.medications} maxLength={1000} onChange={e => update("medications", e.target.value)} />
        </Field>
        <Field label="Medical Conditions" className="md:col-span-2">
          <Textarea value={form.medicalConditions} maxLength={1000} onChange={e => update("medicalConditions", e.target.value)} />
        </Field>
      </Section>

      <Section title="Care Plan">
        <Field label="Care Level">
          <Select value={form.careLevel} onValueChange={(v: any) => update("careLevel", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Preferred Schedule">
          <Input value={form.preferredSchedule} maxLength={200} placeholder="e.g. Mon–Fri 9am–1pm" onChange={e => update("preferredSchedule", e.target.value)} />
        </Field>
        <Field label="Mobility Needs" className="md:col-span-2">
          <Textarea value={form.mobilityNeeds} maxLength={500} onChange={e => update("mobilityNeeds", e.target.value)} />
        </Field>
        <Field label="Dietary Restrictions" className="md:col-span-2">
          <Textarea value={form.dietaryRestrictions} maxLength={500} onChange={e => update("dietaryRestrictions", e.target.value)} />
        </Field>
        <Field label="Services Requested" className="md:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SERVICE_OPTIONS.map(svc => (
              <label key={svc} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.servicesRequested.includes(svc)}
                  onCheckedChange={() => toggleService(svc)}
                />
                {svc}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Insurance & Billing">
        <Field label="Insurance Provider">
          <Input value={form.insuranceProvider} maxLength={100} onChange={e => update("insuranceProvider", e.target.value)} />
        </Field>
        <Field label="Policy Number">
          <Input value={form.insurancePolicyNumber} maxLength={100} onChange={e => update("insurancePolicyNumber", e.target.value)} />
        </Field>
        <Field label="Billing Notes" className="md:col-span-2">
          <Textarea value={form.billingNotes} maxLength={1000} onChange={e => update("billingNotes", e.target.value)} />
        </Field>
      </Section>

      <Section title="Consents & Signatures" cols={1}>
        <div className="space-y-3">
          <ConsentBox
            checked={form.consentCare}
            onChange={v => update("consentCare", v)}
            label="I consent to receive home care services as described in this intake."
          />
          <ConsentBox
            checked={form.consentHipaa}
            onChange={v => update("consentHipaa", v)}
            label="I acknowledge receipt of the HIPAA Notice of Privacy Practices and authorize use of my health information for treatment, payment, and operations."
          />
          <ConsentBox
            checked={form.consentBilling}
            onChange={v => update("consentBilling", v)}
            label="I authorize billing to the insurance provider listed and accept responsibility for any uncovered balance."
          />
        </div>
        <SignaturePad
          label="Client / Representative Signature *"
          value={form.clientSignature}
          onChange={v => update("clientSignature", v)}
        />
        <SignaturePad
          label="Witness / Representative Signature (optional)"
          value={form.representativeSignature}
          onChange={v => update("representativeSignature", v)}
        />
        <Field label="Staff Member Name">
          <Input
            value={form.staffName}
            maxLength={100}
            onChange={e => update("staffName", e.target.value)}
          />
        </Field>
        <SignaturePad
          label="Staff Signature (optional)"
          value={form.staffSignature}
          onChange={v => update("staffSignature", v)}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  cols = 2,
}: {
  title: string;
  children: React.ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground border-b pb-1">{title}</h3>
      <div className={cols === 2 ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function ConsentBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 p-3 border rounded-md bg-muted/30">
      <Checkbox checked={checked} onCheckedChange={v => onChange(!!v)} className="mt-0.5" />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

function IntakePrintable({ intake }: { intake: IntakeForm }) {
  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div className="grid grid-cols-3 gap-2 py-1 border-b border-border/60">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{value || "—"}</span>
    </div>
  );
  return (
    <div className="space-y-6 print:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Intake Form</h1>
          <p className="text-sm text-muted-foreground">
            Created {new Date(intake.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={
            intake.status === "Signed"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          }
        >
          {intake.status}
        </Badge>
      </div>

      <PrintSection title="Personal Information">
        <Row label="Full Name" value={intake.fullName} />
        <Row label="Date of Birth" value={intake.dateOfBirth} />
        <Row label="Gender" value={intake.gender} />
        <Row label="Phone" value={intake.phone} />
        <Row label="Email" value={intake.email} />
        <Row label="Address" value={intake.address} />
      </PrintSection>

      <PrintSection title="Representative">
        <Row label="Name" value={intake.representativeName} />
        <Row label="Relationship" value={intake.representativeRelation} />
        <Row label="Phone" value={intake.representativePhone} />
      </PrintSection>

      <PrintSection title="Emergency Contact">
        <Row label="Name" value={intake.emergencyContactName} />
        <Row label="Phone" value={intake.emergencyContactPhone} />
      </PrintSection>

      <PrintSection title="Medical">
        <Row label="Primary Physician" value={intake.primaryPhysician} />
        <Row label="Physician Phone" value={intake.physicianPhone} />
        <Row label="Allergies" value={intake.allergies} />
        <Row label="Medications" value={intake.medications} />
        <Row label="Conditions" value={intake.medicalConditions} />
      </PrintSection>

      <PrintSection title="Care Plan">
        <Row label="Care Level" value={intake.careLevel} />
        <Row label="Preferred Schedule" value={intake.preferredSchedule} />
        <Row label="Services Requested" value={intake.servicesRequested.join(", ")} />
        <Row label="Mobility Needs" value={intake.mobilityNeeds} />
        <Row label="Dietary Restrictions" value={intake.dietaryRestrictions} />
      </PrintSection>

      <PrintSection title="Insurance & Billing">
        <Row label="Provider" value={intake.insuranceProvider} />
        <Row label="Policy Number" value={intake.insurancePolicyNumber} />
        <Row label="Billing Notes" value={intake.billingNotes} />
      </PrintSection>

      <PrintSection title="Consents">
        <Row label="Care Consent" value={intake.consentCare ? "Agreed" : "Not agreed"} />
        <Row label="HIPAA" value={intake.consentHipaa ? "Agreed" : "Not agreed"} />
        <Row label="Billing" value={intake.consentBilling ? "Agreed" : "Not agreed"} />
      </PrintSection>

      <PrintSection title="Signatures">
        <SignatureBlock
          label="Client / Representative"
          dataUrl={intake.clientSignature}
          signedAt={intake.clientSignedAt}
        />
        {intake.representativeSignature && (
          <SignatureBlock
            label="Witness / Representative"
            dataUrl={intake.representativeSignature}
            signedAt={intake.representativeSignedAt}
          />
        )}
        {intake.staffSignature && (
          <SignatureBlock
            label={`Staff${intake.staffName ? ` — ${intake.staffName}` : ""}`}
            dataUrl={intake.staffSignature}
            signedAt={intake.staffSignedAt}
          />
        )}
      </PrintSection>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        This document is a copy of the signed client intake. Please retain for your records.
      </p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

function SignatureBlock({
  label,
  dataUrl,
  signedAt,
}: {
  label: string;
  dataUrl: string;
  signedAt?: string;
}) {
  return (
    <div className="py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {dataUrl ? (
        <img src={dataUrl} alt={`${label} signature`} className="h-20 border-b border-foreground/40" />
      ) : (
        <div className="h-20 border-b border-foreground/40" />
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Signed: {signedAt ? new Date(signedAt).toLocaleString() : "—"}
      </p>
    </div>
  );
}