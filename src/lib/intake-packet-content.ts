// Client Intake Information Packet
// Body texts adapted from authoritative public sources:
//  - HHS Office for Civil Rights (HIPAA Notice of Privacy Practices model)
//  - CMS Conditions of Participation for Home Health (42 CFR §484.50 Patient Rights)
//  - National Center on Elder Abuse / Administration for Community Living (ACL)
//  - CDC — Infection prevention in home healthcare
//  - Ready.gov / FEMA — Emergency preparedness for older adults & individuals with disabilities
//  - ACL.gov — Advance Care Planning / Advance Directives
// Agencies should review with their licensing board and legal counsel before use.

export interface PacketSubsection {
  id: string;
  title: string;
  body: string;
  source?: string;
}
export interface PacketSection {
  id: string;
  title: string;
  items: PacketSubsection[];
}

export const PACKET_TITLE = "Client Information & Admission Packet";

export const PACKET_SECTIONS: PacketSection[] = [
  {
    id: "s1",
    title: "Section 1 — Welcome & Agency Policies",
    items: [
      {
        id: "1.1",
        title: "1.1 Welcome Letter and Hours of Operation",
        body:
`Dear Client and Family,

Welcome to our home care agency. We are honored that you have chosen us to participate in your care. Our mission is to deliver compassionate, person-centered services that promote your independence, dignity, safety, and well-being in the comfort of your own home.

Our office is open Monday through Friday, 8:00 a.m. to 5:00 p.m. local time. Direct caregiver services may be scheduled outside of these hours according to your authorized care plan, including evenings, weekends, and holidays. An on-call supervisor is available 24 hours a day, 7 days a week, including holidays, to address urgent care concerns, schedule changes, after-hours questions, or emergencies. The 24-hour on-call number is provided in your client folder and on the magnet/contact card delivered at admission.

During business hours you may reach our office for scheduling, billing, care plan questions, and general information. After business hours, please call the on-call line for any care-related concern that cannot wait until the next business day. For any life-threatening emergency, always call 911 first, then notify the agency.

We look forward to serving you and your family.`,
      },
      {
        id: "1.2",
        title: "1.2 Admission Criteria",
        body:
`To be admitted to services, the prospective client must meet the following criteria:

1. Reside within the agency's licensed and approved geographic service area.
2. Have a documented need for one or more services the agency is licensed and competent to provide (for example: personal care, homemaker services, companionship, medication reminders, skilled nursing where applicable).
3. Have a home environment that is reasonably safe for both the client and assigned staff. The agency will conduct a home safety assessment at intake and periodically thereafter.
4. Agree to the agency's policies, including those regarding payment, client rights and responsibilities, infection control, and emergency preparedness.
5. Provide accurate health, contact, and insurance information, and authorize the agency to coordinate with the client's physician and, when applicable, payer.

The agency does not discriminate in admission, treatment, or employment on the basis of race, color, national origin, ancestry, religion, sex, sexual orientation, gender identity or expression, age, disability, marital status, veteran status, source of payment, or any other status protected by applicable federal, state, or local law.

Admission may be deferred or denied if the client's needs exceed the scope or competency of the agency's services, if the home cannot be made reasonably safe, or if other criteria above cannot be met. In such cases, the agency will assist with referrals to more appropriate providers.`,
      },
      {
        id: "1.3",
        title: "1.3 Fee Schedule & Payment of Services Policy",
        body:
`Charges for services are based on the agency's current published fee schedule, which is provided to the client at admission and available upon request. Rates may vary by service type (for example: personal care, companion care, skilled nursing), shift length, time of day, day of week, and holiday status. The fee schedule is subject to change with at least 30 days' written notice to active clients, except where a payer or contract dictates the rate.

Payment terms:
• Private-pay clients: invoices are issued on a regular cycle (typically weekly or bi-weekly) and are due upon receipt unless otherwise agreed in writing. Accepted payment methods include check, ACH bank transfer, and major credit/debit cards. Accounts more than 30 days past due may result in suspension of services after written notice.
• Insurance, Medicaid, Medicare, VA, long-term care insurance, or managed care: the agency will bill the payer directly for covered services in accordance with applicable authorization. The client remains responsible for any non-covered services, denied claims, deductibles, copays, coinsurance, and amounts above authorized hours.
• Authorization limits: services beyond an authorized number of hours, or outside the authorized service period, will not be billed to the payer and may be billed to the client at the private-pay rate, only with the client's prior written agreement.

The client (or responsible party) acknowledges financial responsibility for all services received and agrees to notify the agency promptly of any change in payer, address, telephone number, or insurance coverage.`,
      },
      {
        id: "1.4",
        title: "1.4 Medication Assistance Policy",
        body:
`The agency's role in medications depends on the level of care authorized and applicable state law. In general:

1. Medication Reminders (non-licensed personnel): Caregivers may remind the client to take self-administered medications at the prescribed time, open prepared containers (such as pre-filled pill organizers), read labels aloud, hand the container to the client, and document that the reminder was given. Caregivers do not select, measure, prepare, alter doses, or place medication into the client's mouth.
2. Medication Administration (licensed nurses or qualified medication aides where permitted by state law): Performed only by personnel whose scope of practice permits administration, in accordance with a current physician's order and the agency's policy.
3. Self-administration: Clients who are alert and able are responsible for managing their own medications, including obtaining refills. Family or representatives may assist as needed.
4. Pre-filling pill organizers: This is performed by the client, family, pharmacy, or licensed nurse — not by non-licensed caregivers, unless explicitly permitted by state regulation and agency policy.
5. Documentation: All medication-related activity performed by agency staff is documented in the visit record. Any refusal, missed dose, suspected adverse reaction, or medication error is reported immediately to the agency supervisor and, when clinically warranted, to the prescribing physician and/or 911.
6. Storage and disposal: Medications must be stored in their original, labeled containers in a secure location. The agency does not transport or dispose of controlled substances. Clients are encouraged to use community drug take-back programs for unused medication.

The client and family agree to provide the agency with an accurate, current medication list and to notify the agency promptly of any changes ordered by a prescriber.`,
      },
      {
        id: "1.5",
        title: "1.5 Discharge Policy",
        body:
`Services may be discontinued (discharged) for any of the following reasons:
• The client's goals have been met or services are no longer needed.
• The client's condition no longer requires, or has progressed beyond, the level of care the agency is licensed and competent to provide.
• The client transfers to another provider, facility, or hospice.
• The client (or responsible party) requests discharge.
• Non-payment of services after written notice and a reasonable opportunity to resolve the balance.
• The client, family, or others in the home create an environment that is unsafe for staff (including but not limited to threats, harassment, weapons, illegal activity, untreated infectious disease without appropriate precautions, or refusal to maintain a minimally safe physical environment).
• Loss of authorization or coverage by the payer for the services rendered.
• Death of the client.

Except in emergencies, the agency will provide written notice of discharge a reasonable period in advance (typically not less than 14 days for non-emergent administrative discharges) and will assist with referrals to alternative providers, the client's physician, the local Area Agency on Aging, Adult Protective Services where applicable, or the appropriate payer/case manager. Emergency discharges (for example, where staff safety is at imminent risk) may be effective immediately, with notification and referral to follow as soon as is reasonably possible.`,
      },
    ],
  },
  {
    id: "s2",
    title: "Section 2 — Client Rights & Safety",
    items: [
      {
        id: "2.1",
        title: "2.1 Client Rights and Responsibilities",
        body:
`(Adapted from Medicare Conditions of Participation for Home Health Agencies, 42 CFR §484.50.)

As a client of this agency, you have the right to:
1. Be treated with consideration, respect, and full recognition of your dignity and individuality, including privacy in treatment and personal care.
2. Be free from verbal, mental, sexual, and physical abuse; neglect; misappropriation of your property; and exploitation.
3. Make decisions regarding your care, including the right to be informed in advance about the care and treatment to be provided, any changes to that care, and any discipline-specific or specialty services available.
4. Participate in the planning of your care and to be informed in advance of the disciplines that will furnish care, the frequency of visits, and any expected outcomes.
5. Be informed in advance, in writing, of the charges for services, the items and services that may be covered by Medicare, Medicaid, or other federal/state programs, and the items and services for which you may be liable.
6. Receive proper written notice, in advance, of the agency's intent to transfer or discharge you and of the procedures for filing complaints.
7. Voice grievances and complaints regarding treatment or care that is (or fails to be) furnished, or regarding the lack of respect for property, without fear of reprisal, discrimination, or termination of services.
8. Be informed of the toll-free state home health hotline that receives complaints, and of the names, addresses, and telephone numbers of the State agency that licenses the agency, the local Area Agency on Aging, and Adult Protective Services.
9. Have your personal health information protected in accordance with HIPAA.
10. Formulate advance directives and have agency staff comply with them to the extent permitted by state law.
11. Refuse care or treatment after being informed of the consequences of doing so, and to be informed of the agency's policies regarding such refusal.
12. Receive care without discrimination on the basis of race, color, national origin, ancestry, religion, sex, sexual orientation, gender identity or expression, age, disability, marital status, veteran status, or source of payment.

Client and family responsibilities:
• Provide accurate, complete information about current and past medical history and any changes in your condition.
• Follow the plan of care and notify the agency if you are unable or unwilling to do so.
• Provide a safe environment for staff to work in, free from weapons, illegal substances, threats, and harassment.
• Treat agency staff with respect and courtesy.
• Notify the agency in advance when possible if a scheduled visit cannot occur, and notify the agency of any change in address, phone number, insurance, physician, or representative.
• Pay for services in accordance with the agreed fee schedule and payment terms.`,
        source: "42 CFR §484.50",
      },
      {
        id: "2.2",
        title: "2.2 Complaint and Grievance Procedure",
        body:
`You have the right to voice a complaint or grievance about any aspect of your care without fear of reprisal, discrimination, or termination of services. The agency takes all complaints seriously and will investigate them promptly and thoroughly.

How to file a complaint:
1. Speak with your assigned caregiver or the office. Many concerns can be resolved informally and quickly.
2. If your concern is not resolved, contact the agency Administrator or Director of Nursing by phone, email, or in writing using the contact information in your client folder.
3. The agency will acknowledge your complaint, investigate it, and respond to you in writing — typically within 14 calendar days, depending on complexity.
4. If you are not satisfied with the agency's response, or if you prefer to take your complaint outside the agency, you may contact:
   • Your State Department of Health / Home Care Licensing Agency (toll-free home health hotline number provided in your client folder).
   • Your State Long-Term Care Ombudsman.
   • Your local Area Agency on Aging.
   • Adult Protective Services if abuse, neglect, or exploitation is suspected.
   • The Office for Civil Rights of the U.S. Department of Health & Human Services for HIPAA privacy complaints (https://www.hhs.gov/ocr/).
   • Your payer, case manager, or managed care organization for service authorization and payment concerns.

The agency will not retaliate against you, your family, or your representative for filing a complaint or contacting any of the above agencies. Filing a complaint will not affect your eligibility for services.`,
      },
      {
        id: "2.3",
        title: "2.3 HIPAA Notice of Privacy Practices — Summary",
        body:
`(Summary based on the U.S. Department of Health & Human Services Office for Civil Rights model Notice of Privacy Practices.)

THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.

The agency is required by law to maintain the privacy of your protected health information (PHI), to provide you with this Notice of our legal duties and privacy practices, and to follow the terms of the Notice currently in effect.

Uses and disclosures of PHI without your written authorization:
• Treatment — to provide, coordinate, or manage your care, including sharing information with physicians, hospitals, pharmacies, and other care providers.
• Payment — to bill and collect for services from you, your insurer, Medicare, Medicaid, or other payer.
• Health care operations — for quality assessment, staff training, licensing, accreditation, audits, and similar internal functions.
• Required by law — including reports of suspected abuse or neglect, public health activities, court orders, and law enforcement requests as required by law.

Uses and disclosures requiring your written authorization include marketing, the sale of PHI, and most uses or disclosures of psychotherapy notes. You may revoke any authorization in writing at any time, except to the extent we have already acted in reliance on it.

Your rights regarding your PHI:
• Right to inspect and obtain a copy of your record.
• Right to request a correction (amendment) of information you believe is incorrect or incomplete.
• Right to request restrictions on certain uses and disclosures.
• Right to request confidential communications (for example, by mail to a particular address).
• Right to an accounting of certain disclosures we have made.
• Right to a paper copy of this Notice at any time.
• Right to be notified following a breach of unsecured PHI.

If you believe your privacy rights have been violated, you may file a complaint with the agency's Privacy Officer (contact information in your client folder) or with the Secretary of the U.S. Department of Health & Human Services, Office for Civil Rights, at https://www.hhs.gov/ocr/. You will not be retaliated against for filing a complaint.

The agency reserves the right to change this Notice. The current Notice will be available upon request and posted at our office.`,
        source: "HHS OCR — 45 CFR 164.520",
      },
      {
        id: "2.4",
        title: "2.4 Abuse, Neglect, and Exploitation Policy",
        body:
`Every client has the right to be free from abuse, neglect, and exploitation. The agency has a zero-tolerance policy for any such conduct by employees, contractors, family members, or other parties.

Definitions (adapted from the Administration for Community Living / National Center on Elder Abuse):
• Physical abuse — the use of physical force that may result in bodily injury, physical pain, or impairment.
• Sexual abuse — non-consensual sexual contact of any kind.
• Emotional or psychological abuse — the infliction of anguish, pain, or distress through verbal or non-verbal acts, including threats, intimidation, humiliation, and isolation.
• Neglect — the refusal or failure to fulfill any part of a person's obligations or duties to an older or vulnerable adult, including self-neglect by the client.
• Financial or material exploitation — the illegal, unauthorized, or improper use of an adult's funds, benefits, property, or assets for someone else's benefit.
• Abandonment — the desertion of a vulnerable adult by anyone who has assumed responsibility for their care.

Reporting:
• All agency employees and contractors are required to report any suspected abuse, neglect, or exploitation immediately, regardless of who the suspected perpetrator is. Reports are made to the agency Administrator and to the appropriate state Adult Protective Services (APS) and/or law enforcement agency in accordance with state mandatory-reporter laws.
• Clients, family members, and members of the public may also report suspected abuse to APS, the State Long-Term Care Ombudsman, the State Home Care Hotline, or local law enforcement. In a life-threatening emergency, call 911 first.
• National resource: the Eldercare Locator at 1-800-677-1116 or https://eldercare.acl.gov/ can connect callers to local APS and aging services.

The agency will fully cooperate with any investigation and will take prompt corrective action, up to and including termination of employment and referral to law enforcement, against any individual found to have abused, neglected, or exploited a client. No reprisal of any kind will be taken against any individual who in good faith reports a concern.`,
        source: "ACL.gov / NCEA",
      },
    ],
  },
  {
    id: "s3",
    title: "Section 3 — Health & Emergency Information",
    items: [
      {
        id: "3.1",
        title: "3.1 Advance Directive Information",
        body:
`(Adapted from the Administration for Community Living and the federal Patient Self-Determination Act.)

An "advance directive" is a written legal document that lets you state your wishes about medical care in the event you become unable to communicate or make decisions for yourself. Common advance directives include:

• Living Will — describes the medical treatments you would or would not want to keep you alive (for example, mechanical ventilation, CPR, artificial nutrition and hydration), and other care you would want, such as pain management.
• Durable Power of Attorney for Health Care (Health Care Proxy) — names a person you trust (your "agent") to make health care decisions for you if you cannot speak for yourself.
• POLST / MOLST (Physician/Medical Orders for Life-Sustaining Treatment) — a portable medical order, signed by a physician (and in some states the patient), that translates your wishes into specific orders for emergency and other clinicians. Availability and form name vary by state.
• Out-of-Hospital Do-Not-Resuscitate (DNR) order — a physician's order indicating that CPR should not be attempted in the event of cardiopulmonary arrest at home.

Your rights under the federal Patient Self-Determination Act:
• You have the right to make your own health care decisions, to accept or refuse medical treatment, and to formulate an advance directive.
• You have the right to information about your state's laws on advance directives.
• Care may not be conditioned on whether or not you have an advance directive, and the agency will not discriminate against you based on whether you have one.

If you have an advance directive, please provide the agency with a copy so we can keep it in your client record and follow it to the extent permitted by state law. If you change or revoke your advance directive, please notify the agency promptly. The agency does not provide legal advice; resources for completing advance directives are available from your physician, attorney, your state Attorney General's office, the Eldercare Locator (1-800-677-1116), and CaringInfo at https://www.caringinfo.org/.`,
        source: "ACL.gov / Patient Self-Determination Act, 42 USC §1395cc(f)",
      },
      {
        id: "3.2",
        title: "3.2 Client Emergency Information Form (to be completed)",
        body:
`The following information will be collected and kept current in the client's home folder and the agency record. Clients and families are asked to verify and update this information at admission, after any change, and at minimum annually.

1. Client legal name, date of birth, and home address (including unit/apartment, gate codes, and any access instructions).
2. Primary phone(s) and best way to reach the client.
3. Emergency contacts — at least two, with name, relationship, daytime and evening phone numbers, and indication of whether each contact has authority to make decisions on the client's behalf.
4. Primary care physician — name, clinic, address, and phone.
5. Other key providers — specialists, home health, hospice, dialysis center, oxygen vendor, durable medical equipment supplier, pharmacy.
6. Preferred hospital and any hospital admission preferences.
7. Health insurance(s), Medicare/Medicaid number(s), and other coverage; payer case manager contact if applicable.
8. Allergies (medication, food, environmental) and reaction.
9. Current medication list (name, dose, frequency, prescriber).
10. Significant medical conditions and recent surgeries or hospitalizations.
11. Mobility, communication, vision, and hearing considerations.
12. Advance directive status and location of documents (living will, health care proxy, POLST/MOLST, DNR).
13. Religious or cultural preferences relevant to care or end-of-life decisions.
14. Pets in the home and their care arrangements during an emergency.
15. Backup power needs (for oxygen, CPAP, refrigerated medications, power wheelchair, etc.) and any utility company "medical baseline" registration.

A printable Emergency Information Form will be provided as an attachment for completion and posting in a visible location (for example, on the refrigerator).`,
      },
      {
        id: "3.3",
        title: "3.3 Infection Control Policy",
        body:
`(Adapted from the Centers for Disease Control and Prevention guidance on infection prevention in home healthcare and Standard Precautions.)

The agency follows Standard Precautions during every client encounter. Standard Precautions are based on the principle that all blood, body fluids, secretions, excretions (except sweat), non-intact skin, and mucous membranes may contain transmissible infectious agents. Key elements include:

1. Hand hygiene — staff perform hand hygiene with soap and water or an alcohol-based hand sanitizer (at least 60% alcohol) before and after every client contact, before clean/aseptic procedures, after exposure to body fluids, after contact with the client's surroundings, and before donning and after removing gloves.
2. Personal protective equipment (PPE) — gloves, gowns, masks, eye protection, and respirators are used as appropriate to anticipated exposure. Single-use PPE is discarded after each use.
3. Respiratory hygiene / cough etiquette — covering coughs and sneezes, using and disposing of tissues, and performing hand hygiene afterward.
4. Safe injection and sharps practices — sharps are placed immediately into a puncture-resistant container; needles are not recapped, bent, or removed from syringes by hand. Sharps containers are provided by the client/family or arranged through the appropriate supplier and disposed of in accordance with local regulations.
5. Cleaning and disinfection — equipment shared between clients (such as blood pressure cuffs, glucose meters) is cleaned and disinfected between uses with an EPA-registered hospital-grade disinfectant.
6. Linen and laundry — soiled linens are handled with minimal agitation and laundered in hot water with detergent; gloves are worn during handling.
7. Waste handling — non-sharp regulated medical waste (heavily blood-soaked materials) is double-bagged and disposed of in accordance with local rules.
8. Staff health — staff with fever, vomiting, diarrhea, or rash, or who have been diagnosed with a communicable illness, do not provide direct care until cleared in accordance with CDC and agency guidance. Vaccinations (influenza, COVID-19, hepatitis B, MMR, varicella, Tdap) are recommended/required per agency policy and applicable law.
9. Transmission-Based Precautions (Contact, Droplet, Airborne) are added to Standard Precautions for clients with known or suspected infections, in coordination with the client's physician and public health authorities.

Clients and families are asked to notify the agency in advance of any new diagnosis of an infectious illness so appropriate precautions can be taken.`,
        source: "CDC — Infection Prevention in Home Healthcare",
      },
      {
        id: "3.4",
        title: "3.4 Home Safety Guidelines",
        body:
`A safe home environment helps prevent injuries and supports independence. The agency conducts an initial home safety assessment at admission and reviews it periodically. Recommendations may include:

General safety
• Keep walking paths clear of clutter, electrical cords, and small rugs that can slip or trip.
• Ensure adequate lighting in hallways, stairwells, and bathrooms; use night lights.
• Use sturdy handrails on both sides of stairs and grab bars in bathrooms (in tub/shower and beside toilet).
• Apply non-slip strips or mats in the tub and shower.
• Set water heater temperature to 120°F (49°C) or lower to prevent scald burns.
• Keep frequently used items within easy reach to avoid using step stools.

Fire safety
• Install working smoke alarms on every level of the home and inside/outside each sleeping area; test monthly and replace batteries at least annually.
• Install a carbon monoxide alarm if there are fuel-burning appliances or an attached garage.
• Keep a fire extinguisher in the kitchen and know how to use it.
• Never leave cooking unattended; keep flammable items away from the stove.
• Have an escape plan with two ways out of every room and a meeting place outside the home.
• Smoking, when permitted, should occur only in designated areas, never in bed, and never near oxygen.

Oxygen safety
• Post "No Smoking / No Open Flame" signs and keep oxygen at least 10 feet from open flames, gas stoves, and heaters.
• Do not use petroleum-based products (such as petroleum jelly) on the face while using oxygen.

Falls prevention
• Wear well-fitting, non-skid footwear; avoid loose slippers and walking in socks.
• Use prescribed assistive devices (cane, walker, wheelchair) consistently and maintain them in good condition.
• Review medications with the prescriber regularly to identify those that increase fall risk.
• Have vision and hearing checked annually.

Firearms, sharps, and chemicals
• Store firearms unloaded, locked, and separate from ammunition.
• Store cleaning chemicals, pesticides, and similar products in original containers, away from food and out of reach of children and adults with cognitive impairment.

The client and family agree to work with the agency to address identified safety concerns. Where significant unresolved hazards remain, the agency may require corrective action as a condition of continuing service.`,
      },
      {
        id: "3.5",
        title: "3.5 Emergency Preparedness & Disaster Plan",
        body:
`(Adapted from Ready.gov and FEMA guidance for older adults and people with disabilities.)

Every client should have a personal emergency plan and a basic emergency supply kit. The agency will assist in reviewing and documenting the client's plan at admission and at least annually thereafter.

Personal emergency plan should include:
1. The types of emergencies most likely in your area (for example, hurricanes, tornadoes, earthquakes, wildfires, severe winter storms, extended power outages, pandemic infectious disease).
2. How you will receive emergency alerts (Wireless Emergency Alerts on a mobile phone, NOAA weather radio, local TV/radio, community notification systems).
3. Two evacuation destinations and two routes to each.
4. How you will communicate with your family and emergency contacts; an out-of-area contact who can serve as a single point of communication.
5. Transportation arrangements if you cannot drive and would need help evacuating, including registration with your local emergency management agency's special-needs registry where available.
6. A plan for service animals and pets.
7. A plan for medical equipment and electricity-dependent devices, including registering with your utility company's medical baseline / priority restoration program if available, and arrangements for backup power or alternative locations.

Emergency supply kit (recommended minimums):
• Water — one gallon per person per day, for at least three days.
• Non-perishable food for at least three days, plus a manual can opener.
• Battery-powered or hand-crank radio and NOAA weather radio.
• Flashlight and extra batteries.
• First-aid kit.
• At least a 7-day supply of prescription medications and medical supplies (including a written medication list with prescribers and pharmacies).
• Copies of important documents in a waterproof container (insurance cards, ID, advance directives, contact lists).
• Cash in small bills.
• Cell phone with chargers and a backup battery.
• Whistle to signal for help.
• Sturdy shoes, change of clothes, and warm blanket.
• Personal hygiene items, eyeglasses/contact lens supplies, hearing-aid batteries, and any disability-related supplies.
• Pet food, water, and supplies if applicable.

Agency role during a declared emergency:
• Caregiver visits may be modified, suspended, or relocated based on safety conditions; the agency will make reasonable efforts to maintain essential services to high-acuity clients.
• The agency will attempt to contact each active client and/or emergency contact to confirm safety and care needs.
• Clients with critical needs are prioritized based on a documented acuity assessment.

If you are in immediate danger, call 911. For non-emergency disaster information, call 211 (where available) or your local emergency management office.`,
        source: "Ready.gov / FEMA",
      },
    ],
  },
  {
    id: "s4",
    title: "Section 4 — Consents & Verifications",
    items: [
      {
        id: "4.1",
        title: "4.1 Consent for Services & Verification of Receipt of Information",
        body:
`By signing the Client Intake Form and acknowledging this packet, the client (or authorized representative) certifies and agrees to the following:

1. Consent for Services — I voluntarily request and consent to the home care services described in my plan of care, to be furnished by the agency and its employees and contractors. I understand that I have the right to participate in the planning of my care, to refuse any treatment or service, and to be informed of the consequences of such refusal.
2. Authorization to Coordinate Care — I authorize the agency to communicate with my physician(s), other care providers, my insurer/payer/case manager, and persons I have designated as my representatives or emergency contacts, for the purpose of providing, coordinating, and paying for my care.
3. Financial Responsibility — I have received and understand the Fee Schedule & Payment of Services Policy. I agree to pay for services in accordance with that policy and acknowledge that I am ultimately responsible for any charges not paid by my insurer or other payer.
4. HIPAA Notice — I acknowledge that I have received (or had the opportunity to receive) the agency's HIPAA Notice of Privacy Practices and understand my rights regarding my protected health information.
5. Receipt of Information Packet — I acknowledge that I have received and reviewed the Client Information & Admission Packet, including:
      • 1.1 Welcome Letter and Hours of Operation
      • 1.2 Admission Criteria
      • 1.3 Fee Schedule & Payment of Services Policy
      • 1.4 Medication Assistance Policy
      • 1.5 Discharge Policy
      • 2.1 Client Rights and Responsibilities
      • 2.2 Complaint and Grievance Procedure
      • 2.3 HIPAA Notice of Privacy Practices Summary
      • 2.4 Abuse, Neglect, and Exploitation Policy
      • 3.1 Advance Directive Information
      • 3.2 Client Emergency Information Form
      • 3.3 Infection Control Policy
      • 3.4 Home Safety Guidelines
      • 3.5 Emergency Preparedness & Disaster Plan
   I understand that I may ask questions about any item at any time and that paper or electronic copies will be provided upon request at no charge.
6. Right to Withdraw Consent — I may withdraw this consent at any time, in writing, except to the extent the agency has already acted in reliance on it.

This Verification of Receipt is documented by the client/representative signature on the Client Intake Form, accompanied by the date of signing and the name of the agency staff member who reviewed the packet with the client.`,
      },
    ],
  },
];

export const PACKET_DISCLAIMER =
  "This packet is provided as a starting template based on publicly available federal guidance (HHS Office for Civil Rights, CMS, CDC, ACL/NCEA, Ready.gov/FEMA). It is not legal advice. Each agency must review and tailor these materials to comply with applicable state licensing rules, payer contracts, and accreditation standards.";