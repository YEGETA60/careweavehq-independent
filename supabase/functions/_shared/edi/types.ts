// Shared types for the 837P claim engine.
// All fields below mirror what the X12N 005010X222A1 IG requires.

export interface BillingProvider {
  legal_name: string;
  npi: string;          // Type 2 organizational
  tax_id: string;       // EIN
  tax_id_type?: string; // EI (default) or SY
  taxonomy_code?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  contact_name?: string;
  phone?: string;
  edi_submitter_id: string; // Used in ISA/GS sender ID
}

export interface RenderingProvider {
  first_name: string;
  last_name: string;
  npi: string; // Type 1
  taxonomy_code?: string;
}

export interface Subscriber {
  first_name: string;
  last_name: string;
  member_id: string;
  dob?: string;       // YYYY-MM-DD
  gender?: string;    // M/F/U
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  relationship_to_patient?: string; // 18 = self
}

export interface Patient {
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
}

export interface Payer {
  name: string;
  payer_id_electronic: string;
  claim_filing_indicator: string; // MB, MC, CI, BL, etc.
}

export interface ServiceLine {
  service_date: string;     // YYYY-MM-DD
  service_code: string;     // HCPCS / CPT
  modifiers: string[];      // up to 4
  pos_code: string;         // 12 = home
  unit_type: string;        // UN
  units: number;
  charge: number;
  diagnosis_pointers: string; // e.g. "1:2"
  rendering_provider?: RenderingProvider;
  line_note?: string;
}

export interface ClaimInput {
  claim_id: string;          // patient control number (CLM01)
  total_charge: number;
  pos_code: string;          // facility code (12)
  frequency_code: string;    // 1 original, 7 replacement, 8 void
  provider_signature_indicator: string;
  assignment_indicator: string;
  release_of_info_code: string;
  benefits_assignment_indicator: string;
  service_start: string;
  service_end: string;
  diagnoses: { rank: number; icd10_code: string; poa?: string }[];
  service_lines: ServiceLine[];
  prior_auth?: string;
  referral?: string;
  surprise_billing_nte?: string;
  prior_payer_paid?: number;
  payer: Payer;
  subscriber: Subscriber;
  patient?: Patient;         // omit if patient = subscriber
  rendering_provider?: RenderingProvider;
}

export interface SubmissionInput {
  billing_provider: BillingProvider;
  receiver_name: string;
  receiver_id: string;       // Clearinghouse / payer EDI receiver ID
  test_mode: boolean;
  claims: ClaimInput[];
}

export interface ValidationIssue {
  level: 1 | 2 | 3 | 4;
  claim_id?: string;
  segment?: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface BuiltSubmission {
  edi: string;
  isa_control_number: string;
  gs_control_number: string;
  st_control_number: string;
  segment_count: number;
}