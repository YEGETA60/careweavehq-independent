/**
 * Client-side PHI detection and redaction for support/chat surfaces.
 *
 * IMPORTANT: This is a defense-in-depth helper. It is NOT a substitute for
 * the server-side PHI guard triggers on support_tickets / support_ticket_messages.
 * Treat detection as best-effort — block submission when patterns match and let
 * the user redact before sending.
 */

export type PhiCategory =
  | "ssn"
  | "mrn"
  | "dob"
  | "phone"
  | "email"
  | "address"
  | "diagnosis"
  | "credit_card"
  | "medicaid_id";

export interface PhiMatch {
  category: PhiCategory;
  label: string;
  start: number;
  end: number;
  value: string;
}

const PATTERNS: Array<{
  category: PhiCategory;
  label: string;
  regex: RegExp;
  guard?: (m: RegExpExecArray, full: string) => boolean;
}> = [
  { category: "ssn", label: "Social Security Number", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    category: "ssn",
    label: "Possible SSN (9 digits)",
    regex: /(?<!\d)\d{9}(?!\d)/g,
  },
  { category: "mrn", label: "Medical Record Number", regex: /\bMRN[:#\s-]*\d{4,}\b/gi },
  {
    category: "medicaid_id",
    label: "Medicaid / Member ID",
    regex: /\b(?:medicaid|member)\s*(?:id|#)?\s*[:#-]?\s*[A-Z0-9]{6,}\b/gi,
  },
  {
    category: "dob",
    label: "Date of Birth",
    regex: /\b(?:DOB|date of birth|born on)\b[^\n]{0,40}/gi,
  },
  {
    category: "dob",
    label: "Date (MM/DD/YYYY)",
    regex: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
  },
  {
    category: "phone",
    label: "Phone number",
    regex: /(?<!\d)(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g,
  },
  {
    category: "email",
    label: "Email address",
    regex: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  },
  {
    category: "address",
    label: "Street address",
    regex:
      /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Ct|Court|Pl|Place|Ter|Terrace|Pkwy|Parkway)\b\.?/g,
  },
  {
    category: "diagnosis",
    label: "ICD-10 diagnosis code",
    regex: /\b[A-TV-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?\b/g,
    guard: (_m, full) => /\b(diagnosis|dx|icd|condition|symptom)\b/i.test(full),
  },
  {
    category: "credit_card",
    label: "Credit card number",
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    guard: (m) => {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) return false;
      // Luhn
      let sum = 0,
        alt = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) {
          n *= 2;
          if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
      }
      return sum % 10 === 0;
    },
  },
];

export function detectPhi(text: string): PhiMatch[] {
  if (!text) return [];
  const matches: PhiMatch[] = [];
  for (const p of PATTERNS) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.regex.exec(text)) !== null) {
      if (p.guard && !p.guard(m, text)) continue;
      matches.push({
        category: p.category,
        label: p.label,
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
      });
      if (m.index === p.regex.lastIndex) p.regex.lastIndex++;
    }
  }
  // Deduplicate overlapping matches — keep the first hit per range
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: PhiMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      out.push(m);
      lastEnd = m.end;
    }
  }
  return out;
}

export function redactPhi(text: string): { redacted: string; matches: PhiMatch[] } {
  const matches = detectPhi(text);
  if (matches.length === 0) return { redacted: text, matches };
  let result = "";
  let cursor = 0;
  for (const m of matches) {
    result += text.slice(cursor, m.start) + `[REDACTED:${m.category.toUpperCase()}]`;
    cursor = m.end;
  }
  result += text.slice(cursor);
  return { redacted: result, matches };
}

export function summarizeMatches(matches: PhiMatch[]): string {
  if (matches.length === 0) return "";
  const counts = new Map<string, number>();
  for (const m of matches) counts.set(m.label, (counts.get(m.label) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([k, v]) => `${k}${v > 1 ? ` ×${v}` : ""}`)
    .join(", ");
}

export const PHI_ACK_VERSION = "2026-05-09";

export const PHI_ACK_TEXT = `I understand that Protected Health Information (PHI) — including patient names, dates of birth, Social Security numbers, Medical Record Numbers, diagnoses, addresses, phone numbers, and Medicaid/Member IDs — must NOT be entered into general support tickets or chat. If I need to share PHI to resolve an issue, I will use the in-app secure messaging or the encrypted support channel under our Business Associate Agreement. I acknowledge that any detected PHI in this submission will be blocked or redacted automatically.`;

/** Detects PHI patterns inside a filename (SSN, MRN, DOB, dates). */
export function detectPhiInFilename(name: string): PhiMatch[] {
  if (!name) return [];
  // Replace separators to make detection more reliable
  const normalized = name.replace(/[_]+/g, " ");
  return detectPhi(normalized).filter(m =>
    m.category === "ssn" || m.category === "mrn" || m.category === "dob"
  );
}

/** Strip PHI fragments out of a filename for safe display/storage. */
export function sanitizeFilename(name: string): string {
  const { redacted } = redactPhi(name.replace(/[_]+/g, " "));
  return redacted.replace(/\s+/g, "_").slice(0, 180);
}