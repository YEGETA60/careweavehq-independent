import type { SubmissionInput, BuiltSubmission, ClaimInput } from "./types.ts";

// X12N 005010X222A1 837P builder.
// Delimiters per CMS guidance: element=*, sub-element=:, segment=~, repetition=^
const ELE = "*";
const SUB = ":";
const SEG = "~";
const REP = "^";

function pad(n: number, len: number) {
  return String(n).padStart(len, "0");
}
function ymd(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00Z" : "")) : d;
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1, 2)}${pad(dt.getUTCDate(), 2)}`;
}
function hm(d: Date) {
  return `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}`;
}
function clean(s: string | undefined | null, max = 80) {
  return (s ?? "").toString().replace(/[*~^:]/g, " ").trim().slice(0, max).toUpperCase();
}
function nz(v: number) {
  return Number(v || 0).toFixed(2);
}

function controlNumber9() {
  // Spec-compliant 9-digit numeric control number.
  return pad(Math.floor(Math.random() * 1_000_000_000), 9);
}

export function buildSubmission(sub: SubmissionInput): BuiltSubmission {
  const now = new Date();
  const isaCtl = controlNumber9();
  const gsCtl = String(parseInt(isaCtl, 10));
  const stCtl = "0001";

  const senderId = sub.billing_provider.edi_submitter_id.padEnd(15, " ").slice(0, 15);
  const receiverId = sub.receiver_id.padEnd(15, " ").slice(0, 15);
  const usage = sub.test_mode ? "T" : "P";

  const segs: string[] = [];

  // ===== ISA (envelope) =====
  segs.push(
    [
      "ISA",
      "00", "          ",
      "00", "          ",
      "ZZ", senderId,
      "ZZ", receiverId,
      ymd(now).slice(2),
      hm(now),
      REP,
      "00501",
      isaCtl,
      "0",
      usage,
      SUB,
    ].join(ELE),
  );

  // ===== GS =====
  segs.push(["GS", "HC", senderId.trim(), receiverId.trim(), ymd(now), hm(now), gsCtl, "X", "005010X222A1"].join(ELE));

  // ===== ST + BHT =====
  segs.push(["ST", "837", stCtl, "005010X222A1"].join(ELE));
  segs.push(["BHT", "0019", "00", `BAT${isaCtl.slice(-6)}`, ymd(now), hm(now), "CH"].join(ELE));

  // ===== 1000A Submitter =====
  segs.push(["NM1", "41", "2", clean(sub.billing_provider.legal_name, 60), "", "", "", "", "46", senderId.trim()].join(ELE));
  segs.push(["PER", "IC", clean(sub.billing_provider.contact_name || sub.billing_provider.legal_name, 60),
    "TE", (sub.billing_provider.phone || "").replace(/\D/g, "").slice(0, 10) || "0000000000"].join(ELE));

  // ===== 1000B Receiver =====
  segs.push(["NM1", "40", "2", clean(sub.receiver_name, 60), "", "", "", "", "46", receiverId.trim()].join(ELE));

  // ===== 2000A Billing Provider hierarchy =====
  let hlCounter = 1;
  const hlBilling = hlCounter++;
  segs.push(["HL", String(hlBilling), "", "20", "1"].join(ELE));
  if (sub.billing_provider.taxonomy_code) {
    segs.push(["PRV", "BI", "PXC", sub.billing_provider.taxonomy_code].join(ELE));
  }

  // 2010AA Billing Provider Name
  const bp = sub.billing_provider;
  segs.push(["NM1", "85", "2", clean(bp.legal_name, 60), "", "", "", "", "XX", bp.npi].join(ELE));
  segs.push(["N3", clean(bp.address_line1, 55), clean(bp.address_line2 || "", 55)].filter(Boolean).join(ELE));
  segs.push(["N4", clean(bp.city, 30), clean(bp.state, 2), bp.postal_code.replace(/\D/g, "")].join(ELE));
  segs.push(["REF", bp.tax_id_type || "EI", bp.tax_id].join(ELE));

  // For each claim → emit 2000B subscriber + (optional) 2000C patient + 2300 claim
  for (let i = 0; i < sub.claims.length; i++) {
    const c = sub.claims[i];
    const hlSub = hlCounter++;
    segs.push(["HL", String(hlSub), String(hlBilling), "22", c.patient ? "1" : "0"].join(ELE));
    segs.push(["SBR", "P", c.patient ? "" : "18", "", "", "", "", "", "", c.payer.claim_filing_indicator].join(ELE));

    // 2010BA Subscriber
    const s = c.subscriber;
    segs.push(["NM1", "IL", "1", clean(s.last_name, 35), clean(s.first_name, 25), "", "", "", "MI", s.member_id].join(ELE));
    if (s.address_line1) segs.push(["N3", clean(s.address_line1, 55)].join(ELE));
    if (s.city) segs.push(["N4", clean(s.city, 30), clean(s.state || "", 2), (s.postal_code || "").replace(/\D/g, "")].join(ELE));
    if (s.dob) segs.push(["DMG", "D8", ymd(s.dob), (s.gender || "U").toUpperCase()].join(ELE));

    // 2010BB Payer
    segs.push(["NM1", "PR", "2", clean(c.payer.name, 60), "", "", "", "", "PI", c.payer.payer_id_electronic].join(ELE));

    // 2000C Patient (only when patient != subscriber)
    if (c.patient) {
      const hlPat = hlCounter++;
      segs.push(["HL", String(hlPat), String(hlSub), "23", "0"].join(ELE));
      segs.push(["PAT", s.relationship_to_patient || "19"].join(ELE));
      const p = c.patient;
      segs.push(["NM1", "QC", "1", clean(p.last_name, 35), clean(p.first_name, 25)].join(ELE));
      segs.push(["N3", clean(p.address_line1, 55)].join(ELE));
      segs.push(["N4", clean(p.city, 30), clean(p.state, 2), p.postal_code.replace(/\D/g, "")].join(ELE));
      segs.push(["DMG", "D8", ymd(p.dob), p.gender.toUpperCase()].join(ELE));
    }

    // 2300 Claim
    emitClaim(segs, c, i + 1);
  }

  // ===== SE / GE / IEA =====
  // Segment count = number of segments from ST through SE inclusive.
  const stIndex = segs.findIndex((s) => s.startsWith("ST" + ELE));
  const segmentCount = segs.length - stIndex + 1;
  segs.push(["SE", String(segmentCount), stCtl].join(ELE));
  segs.push(["GE", String(sub.claims.length || 1), gsCtl].join(ELE));
  segs.push(["IEA", "1", isaCtl].join(ELE));

  const edi = segs.map((s) => s + SEG).join("\n");
  return { edi, isa_control_number: isaCtl, gs_control_number: gsCtl, st_control_number: stCtl, segment_count: segmentCount };
}

function emitClaim(segs: string[], c: ClaimInput, _seq: number) {
  // CLM
  segs.push([
    "CLM",
    c.claim_id.slice(0, 38),
    nz(c.total_charge),
    "",
    "",
    [c.pos_code || "12", "B", c.frequency_code || "1"].join(SUB),
    c.provider_signature_indicator || "Y",
    c.assignment_indicator || "A",
    c.benefits_assignment_indicator || "Y",
    c.release_of_info_code || "Y",
  ].join(ELE));

  segs.push(["DTP", "434", "RD8", `${ymd(c.service_start)}-${ymd(c.service_end)}`].join(ELE));

  if (c.prior_auth) segs.push(["REF", "G1", c.prior_auth].join(ELE));
  if (c.referral) segs.push(["REF", "9F", c.referral].join(ELE));
  if (c.surprise_billing_nte) segs.push(["NTE", "ADD", clean(c.surprise_billing_nte, 80)].join(ELE));

  // HI diagnoses (ABK primary, ABF subsequent)
  const dx = [...c.diagnoses].sort((a, b) => a.rank - b.rank).slice(0, 12);
  if (dx.length) {
    const hi = ["HI"];
    dx.forEach((d, idx) => {
      const qual = idx === 0 ? "ABK" : "ABF";
      hi.push([qual, (d.icd10_code || "").replace(".", "")].join(SUB));
    });
    segs.push(hi.join(ELE));
  }

  // 2310B Rendering provider (claim-level, can be overridden per line)
  if (c.rendering_provider) {
    const r = c.rendering_provider;
    segs.push(["NM1", "82", "1", clean(r.last_name, 35), clean(r.first_name, 25), "", "", "", "XX", r.npi].join(ELE));
    if (r.taxonomy_code) segs.push(["PRV", "PE", "PXC", r.taxonomy_code].join(ELE));
  }

  // 2400 Service Lines
  c.service_lines.forEach((l, idx) => {
    segs.push(["LX", String(idx + 1)].join(ELE));
    const proc = ["HC", l.service_code, ...l.modifiers.slice(0, 4)].join(SUB);
    segs.push([
      "SV1",
      proc,
      nz(l.charge),
      l.unit_type || "UN",
      String(l.units),
      l.pos_code || "12",
      "",
      l.diagnosis_pointers || "1",
    ].join(ELE));
    segs.push(["DTP", "472", "D8", ymd(l.service_date)].join(ELE));
    if (l.line_note) segs.push(["NTE", "ADD", clean(l.line_note, 80)].join(ELE));
    if (l.rendering_provider) {
      const r = l.rendering_provider;
      segs.push(["NM1", "82", "1", clean(r.last_name, 35), clean(r.first_name, 25), "", "", "", "XX", r.npi].join(ELE));
    }
  });
}