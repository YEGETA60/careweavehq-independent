import type { SubmissionInput, ValidationIssue, ValidationReport, ClaimInput } from "./types.ts";

const NPI_RE = /^\d{10}$/;
const ICD10_RE = /^[A-TV-Z][0-9][A-Z0-9](\.?[A-Z0-9]{0,4})?$/i;
const POSTAL_RE = /^\d{5}(-?\d{4})?$/;
const HCPCS_RE = /^[A-Z0-9]{5}$/;
const ZIP_OR_PLUS = /^\d{5}(\d{4})?$/;

function need(cond: boolean, level: 1 | 2 | 3 | 4, msg: string, claim_id?: string, segment?: string): ValidationIssue | null {
  return cond ? null : { level, message: msg, claim_id, segment };
}

function pushAll(issues: ValidationIssue[], items: (ValidationIssue | null)[]) {
  for (const i of items) if (i) issues.push(i);
}

export function validateSubmission(sub: SubmissionInput): ValidationReport {
  const issues: ValidationIssue[] = [];
  const bp = sub.billing_provider;

  // ===== Level 2: structural / required =====
  pushAll(issues, [
    need(!!bp?.legal_name, 2, "Billing provider legal name is required (Loop 2010AA NM103)"),
    need(NPI_RE.test(bp?.npi || ""), 4, "Billing provider NPI must be 10 digits (NM109)"),
    need(!!bp?.tax_id, 2, "Billing provider Tax ID/EIN is required (REF*EI)"),
    need(!!bp?.address_line1 && !!bp?.city && !!bp?.state, 2, "Billing provider address is incomplete (N3/N4)"),
    need(POSTAL_RE.test(bp?.postal_code || ""), 4, "Billing provider postal code invalid (N403)"),
    need(!!bp?.edi_submitter_id, 2, "Billing provider EDI submitter ID is required (ISA06/GS02)"),
    need(!!sub.receiver_id, 2, "Receiver/clearinghouse ID required (ISA08/GS03)"),
    need((sub.claims?.length ?? 0) > 0, 2, "Submission must contain at least one claim"),
  ]);

  for (const c of sub.claims ?? []) {
    issues.push(...validateClaim(c));
  }

  return { ok: issues.length === 0, issues };
}

export function validateClaim(c: ClaimInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = c.claim_id;

  // ===== Subscriber / patient =====
  pushAll(issues, [
    need(!!c.subscriber?.member_id, 2, "Subscriber member ID required (NM109 in 2010BA)", id, "2010BA"),
    need(!!c.subscriber?.first_name && !!c.subscriber?.last_name, 2, "Subscriber name required", id, "2010BA"),
    need(!!c.payer?.name && !!c.payer?.payer_id_electronic, 2, "Payer name and electronic payer ID required", id, "2010BB"),
    need(["MB","MC","CI","BL","CH","HM","WC","TV","DS","16","17"].includes(c.payer?.claim_filing_indicator || ""), 4,
         "Claim filing indicator code is invalid (CLM05-1 / SBR09)", id, "SBR"),
    need(!!c.service_start && !!c.service_end, 2, "Service start/end dates required (DTP*434)", id, "2300"),
    need(c.total_charge > 0, 3, "Claim total charge must be > 0", id, "CLM02"),
  ]);

  // ===== Diagnoses =====
  if (!c.diagnoses?.length) {
    issues.push({ level: 2, claim_id: id, segment: "HI", message: "At least one ICD-10 diagnosis is required" });
  } else {
    if (c.diagnoses.length > 12) {
      issues.push({ level: 3, claim_id: id, segment: "HI", message: "Max 12 diagnoses per claim" });
    }
    for (const d of c.diagnoses) {
      if (!ICD10_RE.test((d.icd10_code || "").replace(".", ""))) {
        issues.push({ level: 4, claim_id: id, segment: "HI", message: `ICD-10 code "${d.icd10_code}" is not valid format` });
      }
    }
  }

  // ===== Service lines =====
  if (!c.service_lines?.length) {
    issues.push({ level: 2, claim_id: id, segment: "2400", message: "At least one service line required" });
  } else {
    let lineSum = 0;
    for (let i = 0; i < c.service_lines.length; i++) {
      const l = c.service_lines[i];
      const seg = `2400 line ${i + 1}`;
      pushAll(issues, [
        need(HCPCS_RE.test(l.service_code || ""), 4, `Service code "${l.service_code}" must be a valid 5-char HCPCS/CPT`, id, seg),
        need(/^\d{2}$/.test(l.pos_code || ""), 4, "POS code must be 2 digits (e.g. 12 = home)", id, seg),
        need((l.units || 0) > 0, 3, "Service line units must be > 0", id, seg),
        need((l.charge || 0) >= 0, 3, "Service line charge cannot be negative", id, seg),
        need(["UN","MJ","DA","HR"].includes(l.unit_type || "UN"), 4, "Unit type must be UN/MJ/DA/HR", id, seg),
        need(!!l.diagnosis_pointers, 2, "Diagnosis pointer required (SV107)", id, seg),
        need((l.modifiers?.length ?? 0) <= 4, 4, "Max 4 modifiers per service line", id, seg),
      ]);
      lineSum += Number(l.charge || 0);
    }
    if (Math.abs(lineSum - c.total_charge) > 0.01) {
      issues.push({ level: 3, claim_id: id, segment: "CLM02", message: `Sum of service-line charges (${lineSum.toFixed(2)}) does not equal CLM02 total (${c.total_charge.toFixed(2)})` });
    }
  }

  // ===== Patient address (only if patient != subscriber) =====
  if (c.patient) {
    pushAll(issues, [
      need(!!c.patient.first_name && !!c.patient.last_name, 2, "Patient name required (2010CA)", id, "2010CA"),
      need(!!c.patient.dob, 2, "Patient DOB required when patient differs from subscriber", id, "DMG"),
      need(["M","F","U"].includes(c.patient.gender || ""), 4, "Patient gender must be M/F/U", id, "DMG"),
      need(ZIP_OR_PLUS.test((c.patient.postal_code || "").replace("-", "")), 4, "Patient postal code invalid", id, "N4"),
    ]);
  } else {
    pushAll(issues, [
      need(!!c.subscriber.dob, 2, "Subscriber DOB required when subscriber is patient", id, "DMG"),
      need(["M","F","U"].includes((c.subscriber.gender || "").toUpperCase()), 4, "Subscriber gender required (M/F/U)", id, "DMG"),
    ]);
  }

  // ===== COB sanity =====
  if ((c.prior_payer_paid || 0) > c.total_charge) {
    issues.push({ level: 3, claim_id: id, segment: "AMT", message: "Prior payer paid amount exceeds claim total" });
  }

  return issues;
}