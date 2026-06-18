/**
 * Centralized legal content & disclosures for the CareWeaveHQ platform.
 *
 * IMPORTANT: This content is a TEMPLATE drafted for a software platform serving
 * home-care agencies. It is NOT a substitute for legal advice. Before going to
 * production under your LLC, have a licensed attorney in your jurisdiction
 * review and customize every section (especially Limitation of Liability,
 * Indemnification, BAA, and state-specific home-care/EVV addenda).
 *
 * To rebrand for your LLC, update LEGAL_ENTITY below.
 */

export const LEGAL_ENTITY = {
  // TODO: Replace with your registered LLC details once formed.
  name: "CareWeaveHQ LLC",
  shortName: "CareWeaveHQ",
  product: "CareWeaveHQ Platform",
  website: "https://careweavehq.com",
  supportEmail: "support@careweavehq.com",
  privacyEmail: "privacy@careweavehq.com",
  legalEmail: "legal@careweavehq.com",
  securityEmail: "security@careweavehq.com",
  mailingAddress: "[Registered LLC mailing address — to be added]",
  state: "[State of formation]",
  effectiveDate: "May 9, 2026",
};

export const LAST_UPDATED = LEGAL_ENTITY.effectiveDate;

/* ----------------------------- Footer / global ----------------------------- */

export const FOOTER_DISCLAIMER = `${LEGAL_ENTITY.name} provides software-as-a-service tools for licensed home-care agencies. The ${LEGAL_ENTITY.product} is an administrative and workforce-management platform. It does not provide medical advice, diagnose conditions, or replace the clinical judgment of licensed professionals. Customers are solely responsible for the accuracy of the data they enter, for compliance with HIPAA, the False Claims Act, the 21st Century Cures Act EVV mandate, state Medicaid/MMIS rules, the Fair Labor Standards Act, and all other federal, state, and local laws applicable to their operations.`;

export const COPYRIGHT_LINE = () =>
  `© ${new Date().getFullYear()} ${LEGAL_ENTITY.name}. All rights reserved. ${LEGAL_ENTITY.shortName}® and the ${LEGAL_ENTITY.shortName} logo are trademarks of ${LEGAL_ENTITY.name}.`;

/* --------------------------- Inline disclaimers --------------------------- */

export const INLINE_DISCLAIMERS = {
  clinicalAi:
    "AI-assisted output is informational only. It is not medical advice and does not replace the clinical judgment of a licensed nurse, physician, or other qualified professional. Verify before acting.",
  schedulingAi:
    "AI scheduling suggestions are recommendations only. Final assignment decisions, overtime authorization, and caregiver/client matching remain the responsibility of the agency and its staff.",
  financialEstimate:
    "Amounts shown are estimates based on the data currently in the system. Actual reimbursement is determined by the payer's adjudication of the submitted claim and may differ.",
  evvCompliance:
    "Billing and payroll figures are derived exclusively from GPS-verified EVV visit data, not from scheduled estimates, in accordance with the 21st Century Cures Act and applicable state EVV mandates.",
  familyPortal:
    "This portal is for informational and coordination purposes only. It does not constitute medical advice. In an emergency, dial 911 or contact the on-call supervisor immediately.",
  marketingNotConsent:
    "Marketing materials and screenshots are illustrative. Service availability, integrations, and pricing may vary by state, payer, and subscription tier.",
  betaFeature:
    "This feature is in beta. Functionality may change without notice. Do not rely on it as the system of record until it exits beta.",
  noPHIInSupport:
    "Do not paste Protected Health Information (PHI) into general support chats or tickets. Use the in-app secure messaging or the encrypted support channel.",
};

/* --------------------------------- Sections -------------------------------- */

export interface LegalSection {
  id: string;
  title: string;
  body: string; // markdown-ish plain text rendered with whitespace-pre-wrap
}

export const TERMS_OF_SERVICE: LegalSection[] = [
  {
    id: "tos-acceptance",
    title: "1. Acceptance of Terms",
    body: `These Terms of Service ("Terms") form a binding agreement between you ("Customer", "you") and ${LEGAL_ENTITY.name}, a limited liability company organized under the laws of ${LEGAL_ENTITY.state} ("${LEGAL_ENTITY.shortName}", "we", "us"). By creating an account, clicking "I agree", or using the ${LEGAL_ENTITY.product}, you accept these Terms on behalf of yourself and any organization you represent. If you do not agree, do not use the Service.`,
  },
  {
    id: "tos-eligibility",
    title: "2. Eligibility & Authorized Use",
    body: `You must be at least 18 years old and authorized to bind your organization. The Service is intended for licensed home-care, home-health, and Medicaid-waiver agencies and their authorized personnel. You may not access the Service if you are barred from receiving federal healthcare program payments (e.g., OIG/SAM exclusion).`,
  },
  {
    id: "tos-account",
    title: "3. Accounts & Security",
    body: `You are responsible for safeguarding credentials, enforcing multi-factor authentication where required, and for all activity under your accounts. Notify us immediately at ${LEGAL_ENTITY.securityEmail} of any suspected unauthorized access. Sharing accounts is prohibited.`,
  },
  {
    id: "tos-customer-data",
    title: "4. Customer Data & Responsibility",
    body: `You retain all rights to data you submit ("Customer Data"). You represent that you have all necessary rights, consents, and authorizations to upload Customer Data, including PHI, and to permit ${LEGAL_ENTITY.shortName} to process it to provide the Service. You are solely responsible for the accuracy, legality, and quality of Customer Data, including data submitted to payers, state aggregators, and clearinghouses.`,
  },
  {
    id: "tos-license",
    title: "5. License",
    body: `Subject to these Terms and timely payment of fees, ${LEGAL_ENTITY.shortName} grants you a non-exclusive, non-transferable, revocable license to access and use the Service during your subscription term, solely for your internal business purposes.`,
  },
  {
    id: "tos-restrictions",
    title: "6. Restrictions",
    body: `You will not (a) reverse engineer, decompile, or attempt to extract the source code; (b) resell or sublicense the Service; (c) use the Service to build a competing product; (d) submit malicious code; (e) use the Service in violation of law, including HIPAA, the False Claims Act, anti-kickback statutes, state Medicaid rules, the Telephone Consumer Protection Act, or labor laws; (f) submit knowingly false claims, time entries, or EVV data; or (g) interfere with the Service's integrity.`,
  },
  {
    id: "tos-fees",
    title: "7. Fees, Billing & Taxes",
    body: `Fees are described on the pricing page or in your order. Subscriptions auto-renew at the then-current rate unless canceled before renewal. Fees are non-refundable except as expressly stated. You are responsible for all applicable taxes other than ${LEGAL_ENTITY.shortName}'s income taxes. Late amounts accrue interest at 1.5% per month or the maximum allowed by law, whichever is lower.`,
  },
  {
    id: "tos-thirdparty",
    title: "8. Third-Party Services",
    body: `The Service integrates with third-party providers (e.g., payment processors, clearinghouses, state EVV aggregators such as HHAeXchange and Sandata, AI providers, mapping, telephony, and email). Use of those services is governed by their own terms. ${LEGAL_ENTITY.shortName} is not responsible for outages, errors, or data losses caused by third-party providers.`,
  },
  {
    id: "tos-ai",
    title: "9. AI-Assisted Features",
    body: `Certain features use machine learning models to draft notes, suggest schedules, summarize documents, or prepare manual drafts. Output may be inaccurate, incomplete, or biased. Output is informational only and is NOT clinical, legal, or financial advice. You must review and validate all AI output before relying on it. ${LEGAL_ENTITY.shortName} disclaims all warranties for AI output.`,
  },
  {
    id: "tos-ip",
    title: "10. Intellectual Property",
    body: `${LEGAL_ENTITY.shortName} owns all right, title, and interest in the Service, including software, designs, and documentation. Feedback you provide may be used by ${LEGAL_ENTITY.shortName} without restriction or compensation.`,
  },
  {
    id: "tos-warranty",
    title: "11. Warranty Disclaimer",
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED USE. ${LEGAL_ENTITY.shortName.toUpperCase()} DOES NOT WARRANT THAT CLAIMS SUBMITTED THROUGH THE SERVICE WILL BE ACCEPTED OR PAID, OR THAT EVV DATA WILL BE ACCEPTED BY ANY STATE AGGREGATOR.`,
  },
  {
    id: "tos-liability",
    title: "12. Limitation of Liability",
    body: `TO THE FULLEST EXTENT PERMITTED BY LAW, ${LEGAL_ENTITY.name.toUpperCase()}'S AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE WILL NOT EXCEED THE FEES YOU PAID TO ${LEGAL_ENTITY.shortName.toUpperCase()} IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. IN NO EVENT WILL ${LEGAL_ENTITY.shortName.toUpperCase()} BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST REVENUE, DENIED OR RECOUPED CLAIMS, REGULATORY PENALTIES, OR LOSS OF DATA, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`,
  },
  {
    id: "tos-indemnity",
    title: "13. Indemnification",
    body: `You will defend, indemnify, and hold harmless ${LEGAL_ENTITY.name}, its members, officers, employees, and contractors from and against any third-party claims, losses, and expenses (including reasonable attorneys' fees) arising from (a) your Customer Data; (b) your violation of these Terms or applicable law; (c) claims you submitted to payers or state agencies; or (d) labor, wage, or employment claims by your workforce.`,
  },
  {
    id: "tos-term",
    title: "14. Term & Termination",
    body: `These Terms remain in effect while your subscription is active. ${LEGAL_ENTITY.shortName} may suspend or terminate access for material breach, non-payment, or activity that creates legal or security risk. Upon termination, your access ceases; you may export your data for 30 days, after which we may delete it consistent with our retention policy and applicable law.`,
  },
  {
    id: "tos-law",
    title: "15. Governing Law & Dispute Resolution",
    body: `These Terms are governed by the laws of ${LEGAL_ENTITY.state}, without regard to conflict-of-law principles. Any dispute will be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Rules, in ${LEGAL_ENTITY.state}, except that either party may seek injunctive relief in court for IP or confidentiality violations. THE PARTIES WAIVE ANY RIGHT TO A JURY TRIAL OR TO PARTICIPATE IN A CLASS ACTION.`,
  },
  {
    id: "tos-changes",
    title: "16. Changes",
    body: `We may update these Terms by posting a revised version with a new effective date. Material changes will be notified via in-app notice or email at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.`,
  },
  {
    id: "tos-contact",
    title: "17. Contact",
    body: `${LEGAL_ENTITY.name}\n${LEGAL_ENTITY.mailingAddress}\nLegal: ${LEGAL_ENTITY.legalEmail}\nSupport: ${LEGAL_ENTITY.supportEmail}`,
  },
];

export const PRIVACY_POLICY: LegalSection[] = [
  {
    id: "priv-overview",
    title: "1. Overview",
    body: `This Privacy Policy describes how ${LEGAL_ENTITY.name} collects, uses, discloses, and protects information when you use the ${LEGAL_ENTITY.product}. For PHI handled on behalf of a Covered Entity, ${LEGAL_ENTITY.shortName} acts as a HIPAA Business Associate; the Business Associate Agreement controls in case of conflict.`,
  },
  {
    id: "priv-collected",
    title: "2. Information We Collect",
    body: `Account & contact data (name, email, phone, role); company data (legal name, EIN, address, NPI, payer enrollments); operational data (clients, caregivers, schedules, visits, EVV GPS coordinates, time entries, credentials, payroll, claims); communications (messages, support tickets); device & log data (IP, browser, OS, timestamps, audit events); payment data (processed by our PCI-DSS compliant payment processor — we do not store full card numbers).`,
  },
  {
    id: "priv-use",
    title: "3. How We Use Information",
    body: `(a) Provide and operate the Service; (b) authenticate users and enforce security; (c) submit claims, EVV data, and reports as directed by you; (d) send service, security, and (with consent) marketing communications; (e) generate aggregated/de-identified analytics; (f) detect fraud and abuse; (g) comply with legal obligations.`,
  },
  {
    id: "priv-sharing",
    title: "4. How We Share Information",
    body: `We share data with: subprocessors that host or operate the platform (cloud hosting, database, AI gateway, email, telephony, payment processing); state EVV aggregators and clearinghouses you direct us to transmit to; auditors and regulators when legally required; and successors in a merger or acquisition (with notice). We do NOT sell personal information.`,
  },
  {
    id: "priv-rights",
    title: "5. Your Rights",
    body: `Depending on your jurisdiction (including California, Virginia, Colorado, Connecticut, Utah, and the EU/UK), you may have the right to access, correct, delete, port, or restrict processing of your personal data, and to opt out of targeted advertising. Submit requests to ${LEGAL_ENTITY.privacyEmail}. For PHI, requests must be directed to the Covered Entity (your agency).`,
  },
  {
    id: "priv-retention",
    title: "6. Retention",
    body: `We retain Customer Data for the duration of your subscription plus a configurable retention period (default: 7 years for clinical/billing records consistent with Medicare/Medicaid record-retention norms; 30 days post-termination for non-clinical data unless longer retention is required by law).`,
  },
  {
    id: "priv-security",
    title: "7. Security",
    body: `We implement administrative, physical, and technical safeguards designed to meet HIPAA Security Rule requirements: encryption in transit (TLS 1.2+) and at rest (AES-256), role-based access control, MFA, an append-only PHI audit log retained for 10 years that records every access to and change of PHI (actor, role, action, entity, before/after diff, IP, user agent, request id) and is read-only to application users, vulnerability scanning, and incident response. No system is 100% secure; you must also maintain reasonable safeguards on your end.`,
  },
  {
    id: "priv-children",
    title: "8. Children",
    body: `The Service is not directed to children under 13 and we do not knowingly collect personal information from children except as part of pediatric home-care records uploaded by an authorized agency.`,
  },
  {
    id: "priv-international",
    title: "9. International Transfers",
    body: `We process data in the United States. If you access the Service from outside the U.S., you consent to the transfer of your information to the U.S., which may have different data-protection laws than your jurisdiction.`,
  },
  {
    id: "priv-cookies",
    title: "10. Cookies & Analytics",
    body: `We use strictly necessary cookies (session, CSRF, MFA), and limited first-party analytics to measure performance. We do not use third-party advertising cookies in the authenticated app. Marketing pages may use limited analytics with consent where required.`,
  },
  {
    id: "priv-changes",
    title: "11. Changes",
    body: `We will post material changes with a new effective date and notify Customers by email or in-app notice.`,
  },
  {
    id: "priv-contact",
    title: "12. Contact",
    body: `Privacy questions: ${LEGAL_ENTITY.privacyEmail}\nSecurity reports: ${LEGAL_ENTITY.securityEmail}\nMail: ${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.mailingAddress}`,
  },
];

export const HIPAA_NOTICE: LegalSection[] = [
  {
    id: "hipaa-role",
    title: "Business Associate Status",
    body: `${LEGAL_ENTITY.name} acts as a HIPAA Business Associate to home-care and home-health agencies that are Covered Entities under 45 CFR Parts 160 and 164. We sign a Business Associate Agreement (BAA) with each Customer that handles Protected Health Information (PHI) through the ${LEGAL_ENTITY.product}.`,
  },
  {
    id: "hipaa-uses",
    title: "Permitted Uses & Disclosures",
    body: `${LEGAL_ENTITY.shortName} uses and discloses PHI only as permitted by the BAA and HIPAA Privacy Rule, including: providing the Service, transmitting EVV data and claims as directed by the Customer, performing data aggregation services for the Customer, and as required by law. We will not sell PHI or use it for marketing without authorization.`,
  },
  {
    id: "hipaa-safeguards",
    title: "Safeguards",
    body: `${LEGAL_ENTITY.shortName} implements administrative, physical, and technical safeguards required by 45 CFR § 164.308–.312, including encryption, access control, an append-only PHI audit log (10-year retention) capturing every access to and change of PHI with actor, role, action, entity, before/after diff, IP, user agent, and request id, integrity controls, and transmission security. The audit log is enforced as append-only at the database layer and is readable only by authorized administrators. Workforce members are trained on HIPAA and bound by confidentiality agreements.`,
  },
  {
    id: "hipaa-breach",
    title: "Breach Notification",
    body: `In the event of a Breach of Unsecured PHI, ${LEGAL_ENTITY.shortName} will notify the affected Covered Entity without unreasonable delay and in no case later than 60 days after discovery, consistent with 45 CFR §§ 164.410 and 164.412.`,
  },
  {
    id: "hipaa-individual-rights",
    title: "Individual Rights",
    body: `Patients should direct requests for access, amendment, accounting of disclosures, and complaints to their care agency (the Covered Entity). The agency's Notice of Privacy Practices governs.`,
  },
  {
    id: "hipaa-baa",
    title: "Requesting a BAA",
    body: `Customers can download our standard BAA template or request a counter-signed BAA at ${LEGAL_ENTITY.legalEmail}. PHI must not be uploaded to the Service until a BAA is in place.`,
  },
];

export const ACCEPTABLE_USE: LegalSection[] = [
  {
    id: "aup-prohibited",
    title: "Prohibited Activities",
    body: `You will not use the Service to: (a) submit false or fraudulent claims; (b) falsify EVV records, time entries, or signatures; (c) discriminate against clients or workers in violation of law; (d) harass, threaten, or harm any person; (e) transmit malware; (f) probe, scan, or test vulnerabilities without written permission; (g) violate intellectual-property rights; (h) send unsolicited commercial messages in violation of CAN-SPAM/TCPA.`,
  },
  {
    id: "aup-enforcement",
    title: "Enforcement",
    body: `${LEGAL_ENTITY.shortName} may suspend accounts engaged in prohibited activity, preserve evidence, and cooperate with law-enforcement. Repeated or egregious violations result in termination without refund.`,
  },
];

export const DISCLAIMERS: LegalSection[] = [
  {
    id: "disc-not-medical",
    title: "Not Medical Advice",
    body: `The ${LEGAL_ENTITY.product} is administrative software. It does not provide medical advice, diagnose, treat, or prevent any disease. Clinical decisions must be made by licensed professionals exercising independent professional judgment.`,
  },
  {
    id: "disc-not-legal",
    title: "Not Legal or Financial Advice",
    body: `Materials in the Operations Manual, AI-generated drafts, dashboards, and reports are general information. They are not legal, tax, accounting, or compliance advice. Consult qualified professionals for advice specific to your situation.`,
  },
  {
    id: "disc-payer",
    title: "No Guarantee of Payment",
    body: `${LEGAL_ENTITY.shortName} does not guarantee that any claim, EVV submission, or authorization request submitted through the Service will be approved, accepted, or paid. Payer adjudication, state aggregator validations, and authorization rules are determined by third parties.`,
  },
  {
    id: "disc-ai",
    title: "AI Output Disclaimer",
    body: `Outputs generated by AI features may be inaccurate, biased, or fabricated. You must review and verify all AI output before clinical, billing, payroll, or compliance use. ${LEGAL_ENTITY.shortName} is not liable for actions taken in reliance on AI output.`,
  },
  {
    id: "disc-third-party",
    title: "Third-Party Marks",
    body: `Names of third-party services such as HHAeXchange, Sandata, Stripe, Google, Apple, and others are trademarks of their respective owners. Use of those marks is for identification only and does not imply endorsement.`,
  },
  {
    id: "disc-screenshots",
    title: "Illustrative Data",
    body: `Sample data, demo accounts, and screenshots may contain fictitious clients, caregivers, and amounts for illustration. They do not depict real patients or transactions.`,
  },
];

export const ALL_LEGAL = {
  terms: { label: "Terms of Service", sections: TERMS_OF_SERVICE },
  privacy: { label: "Privacy Policy", sections: PRIVACY_POLICY },
  hipaa: { label: "HIPAA Notice", sections: HIPAA_NOTICE },
  aup: { label: "Acceptable Use Policy", sections: ACCEPTABLE_USE },
  disclaimers: { label: "Disclaimers", sections: DISCLAIMERS },
} as const;

export type LegalDocKey = keyof typeof ALL_LEGAL;