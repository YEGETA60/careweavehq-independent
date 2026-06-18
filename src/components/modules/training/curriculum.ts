// Starter curriculum for the CareWeaveHQ Learning Library.
// Lessons are intentionally concise overviews — use the in-app authoring
// tools to extend them with agency-specific policies and state regulations.

export type SeedQuiz = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
};

export type SeedLesson = {
  slug: string;
  title: string;
  body_md: string;
  est_minutes?: number;
  quizzes?: SeedQuiz[];
};

export type SeedCourse = {
  slug: string;
  title: string;
  summary: string;
  role_tags: string[]; // "caregiver" | "nurse" | "manager" | "admin" | ...
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number;
  cover_emoji?: string;
  sort_order: number;
  lessons: SeedLesson[];
};

const DISCLAIMER =
  "\n\n> **Disclaimer.** This lesson is general best-practice education, not legal, clinical, or compliance advice. Always follow your state regulations, payer rules, and your agency's written policies.";

const L = (slug: string, title: string, body: string, quizzes?: SeedQuiz[], est = 6): SeedLesson => ({
  slug,
  title,
  body_md: body + DISCLAIMER,
  est_minutes: est,
  quizzes,
});

// ============================================================
// CAREGIVER TRACK
// ============================================================

const caregiverCourses: SeedCourse[] = [
  {
    slug: "hha-fundamentals",
    title: "Home Health Aide Fundamentals",
    summary: "Core role of the HHA: scope of practice, ethics, and the team-based model of home care.",
    role_tags: ["caregiver"],
    category: "Foundations",
    level: "beginner",
    estimated_minutes: 30,
    cover_emoji: "🏠",
    sort_order: 10,
    lessons: [
      L("scope", "Scope of practice & legal limits",
        `# Scope of practice\n\nA Home Health Aide (HHA) supports clients with **activities of daily living (ADLs)**, light housekeeping, meal prep, transportation, companionship, and reporting changes in condition.\n\n## What HHAs DO\n- Bathing, grooming, dressing, toileting, transfers\n- Meal preparation and assistance with eating\n- Vital sign checks if trained and permitted by state\n- Documentation of tasks performed and observations\n- Reminding clients to take their own medications\n\n## What HHAs DO NOT do (in most states)\n- Administer medications, injections, or insulin\n- Sterile wound care, catheter insertion, suctioning\n- Diagnose conditions or change the plan of care\n- Take verbal medical orders\n\nWhen in doubt, **stop and call the supervisor**. Performing tasks outside your scope is a state and federal violation and puts the client at risk.`,
        [
          { question: "Which task is normally OUTSIDE the HHA scope of practice?", options: ["Reminding a client to take their medication", "Assisting with bathing", "Administering an insulin injection", "Preparing a meal"], correct_index: 2, explanation: "Only a licensed nurse may administer injections in most states." },
          { question: "If asked to perform a task you are unsure about, you should:", options: ["Try your best", "Refuse and call the supervisor", "Ask the family", "Skip it without telling anyone"], correct_index: 1 },
        ]),
      L("ethics", "Ethics, boundaries & professionalism",
        `# Ethics & boundaries\n\n## Core principles\n- **Respect** — honor the client's dignity, choices, and cultural background\n- **Confidentiality** — never share client info outside the care team\n- **Honesty** — document only what you actually observed and did\n- **Integrity** — no gifts, loans, or money from clients\n\n## Boundaries\n- Don't accept friend requests or share personal phone numbers\n- Don't run personal errands not on the care plan\n- Don't bring family/friends/pets to visits\n- Don't discuss other clients or staff\n\nReport any boundary concerns to your supervisor immediately.`,
        [
          { question: "A client offers you a $50 tip. You should:", options: ["Accept and say thanks", "Politely decline and document it", "Accept but don't tell anyone", "Demand more"], correct_index: 1 },
        ]),
      L("team", "The home care team & communication",
        `# Team-based care\n\nThe HHA is the **eyes and ears** of the team. You see the client more than anyone — the nurse, manager, family, and physician rely on your observations.\n\n## Who's on the team\n- **RN/Case Manager** — writes the plan of care, supervises\n- **Scheduler** — assigns visits\n- **Office/Manager** — payroll, scheduling, escalations\n- **Family/POA** — emergency contact\n- **Physician** — orders\n\n## When to escalate immediately\n- Falls, injuries, chest pain, shortness of breath, confusion\n- Bruises, skin tears, pressure injuries\n- Refusal of care, refusal to eat\n- Unsafe home conditions or suspected abuse\n\nUse the messaging or call your supervisor — **never wait until the next visit** for an urgent change.\n\n## Staying connected to the field\n- [Alliance for Care at Home](https://allianceforcareathome.org) — the national voice for home care; offers caregiver recognition programs and industry research`),
    ],
  },
  {
    slug: "personal-care-adls",
    title: "Personal Care & ADLs",
    summary: "Bathing, grooming, dressing, toileting, transfers, and assistance with eating — safely and with dignity.",
    role_tags: ["caregiver"],
    category: "Clinical skills",
    level: "beginner",
    estimated_minutes: 35,
    cover_emoji: "🛁",
    sort_order: 20,
    lessons: [
      L("bathing", "Bathing & skin care",
        `# Safe bathing\n\n## Before\n- Gather supplies (towels, washcloths, no-rinse soap, gloves)\n- Check water temperature (~100–105°F / 38–40°C) with your wrist or a thermometer\n- Close doors, keep the room warm, ensure privacy\n- Place non-slip mat in tub/shower\n\n## During\n- Wash from clean to dirty: face → arms → trunk → legs → perineal area last\n- Inspect skin for redness, breakdown, rashes, bruises — **document & report**\n- Never leave the client unattended in the tub\n\n## After\n- Pat dry (don't rub) — especially skin folds\n- Apply moisturizer per care plan\n- Change linens if soiled`,
        [
          { question: "Safe bath water temperature is approximately:", options: ["80°F", "100–105°F", "115°F", "120°F"], correct_index: 1 },
          { question: "When bathing, wash:", options: ["Dirty to clean", "Bottom to top", "Clean to dirty", "Any order"], correct_index: 2 },
        ]),
      L("dressing", "Dressing & grooming",
        `# Dressing\n\n- Let the client choose clothing when possible — preserve autonomy\n- Dress the **weak/affected side first**, undress the strong side first\n- Use adaptive clothing if available (Velcro, side zippers)\n- Brush hair, oral care twice daily, shave per preference\n- Trim nails only if your agency policy and care plan allow — **never** for diabetic clients without nurse approval`),
      L("transfers", "Safe transfers & body mechanics",
        `# Body mechanics\n\nProtect your back and your client's safety.\n\n## Rules\n- **Plan** the transfer; explain to the client\n- Bed at hip height; lock wheels\n- Feet shoulder-width, knees bent, back straight\n- **Push/pull from your legs**, not your back\n- Use a gait belt for stand-pivot transfers\n- Two-person or mechanical lift for clients who can't bear weight\n\n## Never\n- Lift under the arms (shoulder injury)\n- Transfer alone if the care plan says two-person\n- Skip the gait belt to save time`,
        [
          { question: "When transferring, you should bend your:", options: ["Back", "Knees", "Neck", "Shoulders"], correct_index: 1 },
          { question: "If the care plan calls for a two-person transfer, you should:", options: ["Try alone if you're strong", "Wait for help", "Ask the family member instead", "Skip the transfer"], correct_index: 1 },
        ]),
    ],
  },
  {
    slug: "infection-control-ppe",
    title: "Infection Control & PPE",
    summary: "Hand hygiene, standard and transmission-based precautions, PPE donning/doffing, bloodborne pathogens.",
    role_tags: ["caregiver", "nurse"],
    category: "Safety",
    level: "beginner",
    estimated_minutes: 30,
    cover_emoji: "🧼",
    sort_order: 30,
    lessons: [
      L("hand-hygiene", "Hand hygiene — your #1 defense",
        `# Hand hygiene\n\n## The 5 moments\n1. Before touching a client\n2. Before a clean/aseptic task\n3. After body fluid exposure\n4. After touching a client\n5. After touching the client's surroundings\n\n## How\n- **Soap & water**: 20 seconds (sing "Happy Birthday" twice). Required if hands are visibly dirty or after C. difficile / norovirus contact.\n- **Alcohol gel (60%+)**: rub until dry, ~20 seconds.\n\nKeep nails short. No artificial nails when providing direct care.`,
        [
          { question: "How long should you wash with soap and water?", options: ["5 seconds", "10 seconds", "20 seconds", "60 seconds"], correct_index: 2 },
        ]),
      L("ppe", "PPE — donning & doffing order",
        `# Personal protective equipment\n\n## Donning (put ON) — clean order\n1. Gown\n2. Mask / respirator\n3. Goggles or face shield\n4. Gloves (over gown cuffs)\n\n## Doffing (take OFF) — dirty order\n1. Gloves\n2. Goggles / face shield\n3. Gown\n4. Mask (untie back ties, don't touch front)\n5. **Hand hygiene** after each removal step and at the end\n\nNever reuse single-use PPE between clients.`,
        [
          { question: "When removing PPE, what comes off FIRST?", options: ["Mask", "Gown", "Gloves", "Goggles"], correct_index: 2 },
        ]),
      L("bbp", "Bloodborne pathogens & exposure",
        `# Bloodborne pathogens (HIV, HBV, HCV)\n\n## Standard precautions\nTreat **all blood and body fluids** as potentially infectious — regardless of diagnosis.\n\n## If exposed (needle stick, splash to eyes/mouth)\n1. Wash the area immediately with soap and water (or flush eyes for 15 min)\n2. Report to your supervisor within the hour\n3. Document the source, type of exposure, PPE worn\n4. Follow your agency's post-exposure protocol — may include testing & prophylaxis\n\nDo not handle sharps. If you find a needle, alert the nurse.`),
    ],
  },
  {
    slug: "dementia-care",
    title: "Dementia & Alzheimer's Care",
    summary: "Communication, behavior management, safety, and supporting families through cognitive decline.",
    role_tags: ["caregiver", "nurse"],
    category: "Clinical skills",
    level: "intermediate",
    estimated_minutes: 40,
    cover_emoji: "🧠",
    sort_order: 40,
    lessons: [
      L("communication", "Communicating with someone who has dementia",
        `# Communication basics\n\n## Do\n- Approach from the front, make eye contact, smile\n- Use the client's name; introduce yourself every visit\n- Speak slowly, one short sentence at a time\n- Offer simple choices ("Blue shirt or red shirt?") not open-ended questions\n- Validate feelings — don't argue with their reality\n- Use gentle touch (if welcomed) and reassuring tone\n\n## Don't\n- Quiz or correct ("Don't you remember me?")\n- Rush, raise your voice, or use baby talk\n- Talk *about* them in their presence as if they're not there`,
        [
          { question: "If a client with dementia insists their long-deceased spouse is coming to visit, you should:", options: ["Correct them firmly", "Argue until they accept reality", "Validate their feelings and gently redirect", "Ignore them"], correct_index: 2 },
        ]),
      L("behaviors", "Behavioral & psychological symptoms",
        `# Understanding behaviors\n\nBehaviors are **communication**. Ask: what is the client trying to tell me?\n\n## Common triggers\n- Pain, hunger, thirst, needing the toilet\n- Overstimulation (TV loud, too many people)\n- Fatigue, sundowning (late-afternoon agitation)\n- Unmet emotional needs (fear, loneliness)\n\n## Strategies\n- Stay calm; lower your voice and shoulders\n- Redirect with a familiar activity (music, folding towels)\n- Reduce noise, dim bright lights\n- Document time, trigger, what worked — patterns help the nurse adjust the plan\n\n## When to call for help\n- Aggression that risks injury\n- Wandering or attempts to leave unsafely\n- Sudden change in behavior (could be UTI, infection, pain)`),
      L("safety", "Home safety & wandering",
        `# Safety in the home\n\n## Common hazards\n- Stove left on, water left running\n- Medications within reach (overdose risk)\n- Slip/trip hazards: rugs, cords, clutter\n- Locked exits — fire hazard / unlocked exits — wandering\n\n## Wandering prevention\n- Door alarms or chimes\n- ID bracelet (MedicAlert / Safe Return)\n- Camouflage exits (curtain over door)\n- Daily activity / exercise to reduce restlessness\n\nReport any wandering or near-miss to the nurse and family the same day.`),
    ],
  },
  {
    slug: "fall-prevention",
    title: "Fall Prevention",
    summary: "Risk assessment, environment, mobility, and what to do if a client falls.",
    role_tags: ["caregiver", "nurse"],
    category: "Safety",
    level: "beginner",
    estimated_minutes: 20,
    cover_emoji: "⚠️",
    sort_order: 50,
    lessons: [
      L("risk", "Who is at risk?",
        `# Fall risk factors\n\n- Age 65+\n- Prior falls in past year\n- Muscle weakness, balance issues\n- Vision problems\n- Medications: sedatives, blood pressure meds, opioids\n- Chronic conditions: Parkinson's, stroke, dementia, diabetes\n- Home hazards: rugs, poor lighting, stairs, cords`),
      L("environment", "Making the home safer",
        `# Home environment\n\n- Remove throw rugs or secure with non-slip backing\n- Add grab bars in bathroom (toilet & shower)\n- Non-slip mats in tub/shower\n- Night lights in hallway, bathroom, bedroom\n- Clear pathways: no cords, clutter\n- Keep frequently used items at waist height\n- Shoes with non-slip soles — no socks alone, no loose slippers`),
      L("if-falls", "If a client falls",
        `# After a fall\n\n## DO NOT immediately lift\n1. Assess: Are they conscious? Bleeding? In pain?\n2. Call 911 if head injury, severe pain, loss of consciousness, suspected fracture\n3. If safe to move: help them roll to side → all fours → to a sturdy chair\n4. Take vital signs if trained\n5. Notify nurse and family immediately\n6. **Document everything**: time, location, what they were doing, injuries, who was notified — file an incident report`,
        [
          { question: "After a fall with a head injury, you should:", options: ["Help them up quickly", "Call 911 and don't move them", "Give them aspirin", "Wait to see if they're okay"], correct_index: 1 },
        ]),
    ],
  },
  {
    slug: "hipaa-caregivers",
    title: "HIPAA & Privacy for Caregivers",
    summary: "What PHI is, how to protect it, and avoiding common HIPAA mistakes.",
    role_tags: ["caregiver", "nurse", "manager", "admin"],
    category: "Compliance",
    level: "beginner",
    estimated_minutes: 25,
    cover_emoji: "🔒",
    sort_order: 60,
    lessons: [
      L("phi-basics", "What counts as PHI?",
        `# Protected Health Information (PHI)\n\nPHI is any information that can identify a client AND relates to their health or care.\n\n## Examples of PHI\n- Name, address, DOB, SSN, MRN\n- Diagnoses, medications, lab results\n- Photos that show the client's face\n- Visit notes, schedules tied to a person\n- Even the fact that someone IS a client\n\n## What is NOT PHI\n- De-identified, aggregate statistics ("we served 200 clients last year")\n- Your own personal health info\n- Information your client has clearly publicized themselves`,
        [
          { question: "Which is PHI?", options: ["Total visits delivered last year", "A client's diagnosis on a sticky note", "Your own blood type", "A press release the client wrote"], correct_index: 1 },
        ]),
      L("daily-rules", "Daily privacy rules",
        `# Day-to-day HIPAA\n\n## Do\n- Lock your phone with a PIN/biometric\n- Use the CareWeaveHQ mobile app for all documentation — never personal text or email\n- Discuss client info only with team members who **need to know**\n- Shred or return paper notes — don't leave them in your car\n\n## Don't\n- Post about clients on social media — ever — even without names\n- Take personal photos with the client visible\n- Discuss clients in public (elevator, grocery store, family dinner)\n- Share your login`),
      L("breach", "What to do if PHI is exposed",
        `# Suspected breach\n\nReport within **the same business day** to your supervisor:\n- Lost or stolen phone with the app\n- Email or text with PHI sent to the wrong person\n- A non-team member seeing client documents\n- Suspected snooping by another employee\n\nFast reporting limits regulatory penalties and protects the client. Honest reporting is **never** punished — covering up always is.`),
    ],
  },
  {
    slug: "evv-caregiver",
    title: "EVV: Clocking In & Out",
    summary: "Electronic Visit Verification: why it matters, how to clock in correctly, and fixing missed clock events.",
    role_tags: ["caregiver"],
    category: "App & EVV",
    level: "beginner",
    estimated_minutes: 20,
    cover_emoji: "📱",
    sort_order: 70,
    lessons: [
      L("why-evv", "Why EVV matters",
        `# Electronic Visit Verification\n\nEVV is required by the **21st Century Cures Act** for all Medicaid personal-care and home-health visits. It proves the visit happened — who, what, when, where.\n\n## The 6 EVV data points\n1. Client receiving service\n2. Caregiver providing service\n3. Date of service\n4. Location (GPS check)\n5. Time service began\n6. Time service ended\n\nWithout valid EVV, **the agency cannot bill** and you cannot be paid for the visit.`,
        [
          { question: "EVV is required by:", options: ["The Affordable Care Act", "The 21st Century Cures Act", "HIPAA", "OSHA"], correct_index: 1 },
        ]),
      L("how-to", "How to clock in correctly",
        `# Clocking in / out in the CareWeaveHQ app\n\n## Clock-in\n1. Open the app **at the client's home** — GPS must match the address\n2. Tap **Clock In**; confirm the client\n3. Wait for the green ✓ — that's your verified start time\n\n## During the visit\n- Check off ADL tasks as you do them\n- Add a visit note before clocking out\n\n## Clock-out\n1. Tap **Clock Out** **before leaving** the home\n2. Confirm tasks completed\n3. Add any observations to escalate to the nurse\n\nIf GPS fails (rural area, dead phone), use the back-up code workflow and notify your supervisor.`),
      L("missed", "Missed clock events",
        `# What if I forgot?\n\nA missed clock-in or clock-out becomes a **manual override** in the system. Office staff will reach out to verify the actual time before billing.\n\n## To minimize problems\n- Set a phone reminder for shift start\n- Don't leave the home until you've clocked out\n- If you noticed within minutes: clock in/out now and message your supervisor\n- Repeated missed clocks may affect your standing\n\nManual overrides are tracked and audited — be honest about the actual times.`),
    ],
  },
  {
    slug: "visit-notes",
    title: "Visit Notes & Documentation",
    summary: "What to document, how to write it, and why your notes are a legal record.",
    role_tags: ["caregiver", "nurse"],
    category: "App & EVV",
    level: "beginner",
    estimated_minutes: 25,
    cover_emoji: "📝",
    sort_order: 80,
    lessons: [
      L("what", "What to document",
        `# Document the visit\n\n## Always include\n- Tasks performed (per care plan)\n- Tasks **not** performed and why (refused, not needed)\n- Client's condition: alert? in pain? appetite? mood?\n- Vital signs if you took them\n- Skin observations\n- Any concerns or changes\n\n## Be objective\n- ✅ "Client refused lunch and stated 'I'm not hungry.'"\n- ❌ "Client was being difficult."\n\nIf it isn't documented, **it didn't happen** — for payers, surveyors, and courts.`,
        [
          { question: "Which is better documentation?", options: ["Client was grumpy", "Client appeared irritated and said \"leave me alone\" when I offered breakfast", "Client was fine", "Client was mean"], correct_index: 1 },
        ]),
      L("legal", "Notes are a legal record",
        `# Legal weight\n\nYour notes can be used in:\n- Medicare/Medicaid audits\n- Insurance disputes\n- Lawsuits, abuse investigations\n- State licensing reviews\n\n## Rules\n- Document during or right after the visit — not days later\n- Never alter a past note — add an addendum with date/time/initials\n- Never document for someone else\n- Never document something you didn't actually do`),
    ],
  },
];

// ============================================================
// NURSE TRACK
// ============================================================

const nurseCourses: SeedCourse[] = [
  {
    slug: "rn-scope-home-care",
    title: "RN/LPN Scope in Home Care",
    summary: "Differences between RN and LPN practice in the home, delegation, and supervision of HHAs.",
    role_tags: ["nurse"],
    category: "Foundations",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "🩺",
    sort_order: 110,
    lessons: [
      L("scope", "RN vs LPN scope",
        `# Scope comparison (general — verify with your state Board of Nursing)\n\n## RN (Registered Nurse)\n- Assessment, plan of care development, evaluation\n- Care plan revisions, OASIS, comprehensive assessments\n- Skilled wound care, IV therapy, infusions\n- Supervision of LPNs and HHAs\n- Initial admission visits and case management\n\n## LPN/LVN (Licensed Practical/Vocational Nurse)\n- Implementation of the RN-developed plan\n- Medication administration (per state rules)\n- Wound care (non-complex, per protocol)\n- Data collection (not initial assessment in most states)\n- **Does not** typically supervise other nurses or finalize the POC`,
        [
          { question: "Who typically writes the initial plan of care in home health?", options: ["LPN", "HHA", "RN", "Family"], correct_index: 2 },
        ]),
      L("delegation", "Delegating to the HHA",
        `# Safe delegation\n\nThe **5 rights of delegation**:\n1. Right **task** — within HHA scope\n2. Right **circumstance** — stable client, predictable outcome\n3. Right **person** — competent and willing\n4. Right **direction/communication** — clear instructions, expectations\n5. Right **supervision/evaluation** — feedback and follow-up\n\nDelegation is a legal act — you remain accountable for the **decision** to delegate even when the HHA performs the task.`),
      L("supervisory", "Supervisory visits",
        `# Supervisory visit cadence\n\nMost states require RN supervision of HHAs every 14 or 60 days (state- and payer-specific). The supervisory visit:\n\n- Observes care delivery (with the HHA present at least quarterly)\n- Reviews care plan adherence\n- Updates client/family on goals\n- Documents in CareWeaveHQ as a **Supervisory Visit Note**\n\nMissing a required supervisory visit is a top survey deficiency — schedule them ahead.`),
    ],
  },
  {
    slug: "care-plan-development",
    title: "Care Plan Development (485 / POC)",
    summary: "Building an individualized, measurable plan of care that survives audit.",
    role_tags: ["nurse", "manager"],
    category: "Clinical",
    level: "intermediate",
    estimated_minutes: 35,
    cover_emoji: "📋",
    sort_order: 120,
    lessons: [
      L("anatomy", "Anatomy of a CMS 485 / plan of care",
        `# CMS 485 essentials\n\n- Demographics and dx codes (ICD-10)\n- Medications (with dose, route, frequency, indication)\n- Allergies, DME, safety measures\n- Functional limitations and activities permitted\n- **Goals** — measurable, time-bound\n- **Interventions** — what disciplines will do\n- Frequency and duration of visits per discipline\n- Prognosis and rehab potential\n- Physician signature & date`),
      L("smart-goals", "Writing SMART goals",
        `# SMART goals\n\n**S**pecific — **M**easurable — **A**chievable — **R**elevant — **T**ime-bound\n\n## Weak\n"Client will improve mobility."\n\n## SMART\n"Client will ambulate 50 ft with a rolling walker and standby assist within 4 weeks."\n\nSurveyors look for measurability and discipline-specific interventions. Avoid copy-paste goals across clients.`,
        [
          { question: "Which is a SMART goal?", options: ["Improve quality of life", "Walk better", "Ambulate 50 ft with walker in 4 weeks", "Get stronger soon"], correct_index: 2 },
        ]),
      L("recert", "Recertification & updates",
        `# Recertification\n\nMedicare home-health certification periods are 60 days. Before each recert:\n\n- Reassess and complete OASIS\n- Update goals (mark met / continue / new)\n- Revise medications and interventions\n- Obtain physician signature on the updated POC\n- Document **homebound status** and **need for skilled services**`),
    ],
  },
  {
    slug: "medication-management",
    title: "Medication Management & Reconciliation",
    summary: "High-alert meds, the 5 (now 10) rights, reconciliation at every transition.",
    role_tags: ["nurse"],
    category: "Clinical",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "💊",
    sort_order: 130,
    lessons: [
      L("rights", "The 10 rights of medication administration",
        `# 10 rights\n\n1. Right patient\n2. Right drug\n3. Right dose\n4. Right route\n5. Right time\n6. Right documentation\n7. Right reason / indication\n8. Right response / evaluation\n9. Right to refuse\n10. Right education\n\nDouble-check **high-alert meds**: insulin, anticoagulants, opioids, chemotherapy, concentrated electrolytes.`,
        [
          { question: "Insulin is considered a:", options: ["Low-risk med", "High-alert med", "OTC med", "Supplement"], correct_index: 1 },
        ]),
      L("reconciliation", "Medication reconciliation",
        `# Reconciliation = the safety net\n\nReconcile at every transition: admission, hospital discharge back home, MD visit, recertification, discharge.\n\n## Steps\n1. Collect the **most accurate list possible** (bottles, MAR, pharmacy, MD, family)\n2. Compare with the active POC and orders\n3. Identify discrepancies (duplicates, missing, dose changes, OTCs)\n4. Resolve with the MD — document the call/orders\n5. Update the POC and educate the client/caregiver\n\nHospital-to-home is the highest-risk transition — reconciliation errors at discharge cause many readmissions.`),
    ],
  },
  {
    slug: "wound-care",
    title: "Wound Care Basics",
    summary: "Pressure injury staging, dressing selection, and when to escalate.",
    role_tags: ["nurse"],
    category: "Clinical",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "🩹",
    sort_order: 140,
    lessons: [
      L("staging", "Pressure injury staging",
        `# NPIAP stages (2016 update)\n\n- **Stage 1** — intact skin, non-blanchable erythema\n- **Stage 2** — partial-thickness skin loss with exposed dermis\n- **Stage 3** — full-thickness, fat visible\n- **Stage 4** — full-thickness, exposed bone/tendon/muscle\n- **Unstageable** — depth obscured by slough/eschar\n- **DTPI (deep tissue pressure injury)** — persistent non-blanchable deep red, maroon or purple discoloration\n\nNever stage a wound covered with slough/eschar — call it unstageable until debrided.`,
        [
          { question: "A wound with exposed tendon is at least Stage:", options: ["1", "2", "3", "4"], correct_index: 3 },
        ]),
      L("dressings", "Choosing a dressing",
        `# Dressing selection (general)\n\n- **Dry wound** → hydrogel\n- **Light exudate** → hydrocolloid or thin foam\n- **Moderate–heavy exudate** → foam, alginate\n- **Infected** → antimicrobial (silver), increase change frequency, culture if ordered\n- **Necrotic** → MD order for debridement\n\nFollow physician orders precisely. Document size (L × W × D in cm), wound bed %, exudate, periwound, odor, pain — every visit.`),
      L("escalate", "When to escalate",
        `# Call the MD if\n\n- New or worsening signs of infection (erythema, warmth, purulence, odor, fever)\n- Wound enlarging despite treatment\n- Sudden increase in pain\n- Tunneling or undermining\n- Suspected osteomyelitis\n\nDocument the call, orders received, time, and your read-back.`),
    ],
  },
  {
    slug: "diabetes-management",
    title: "Diabetes Management in the Home",
    summary: "Blood glucose monitoring, insulin basics, hypo/hyper recognition, foot care.",
    role_tags: ["nurse", "caregiver"],
    category: "Clinical",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "🩸",
    sort_order: 150,
    lessons: [
      L("monitoring", "Blood glucose monitoring",
        `# BGM basics\n\n- Target generally 80–130 fasting, < 180 post-meal (individualize)\n- Wash hands, use the side of the fingertip\n- Discard first drop if alcohol used\n- Document time, value, relation to meals/meds\n\n## Critical values (typical)\n- **< 70 mg/dL** — hypoglycemia\n- **> 250 mg/dL** with symptoms — hyperglycemic emergency risk; check ketones if Type 1\n\nReport critical values per orders / call MD.`),
      L("hypo", "Hypo & hyperglycemia",
        `# Hypoglycemia (low)\n\n**Symptoms**: shaky, sweaty, confused, irritable, dizzy, fast HR\n**Treatment (15-15 rule, if alert & able to swallow)**:\n- 15 g fast carb (4 oz juice, 3–4 glucose tabs)\n- Recheck in 15 min\n- Repeat until > 70, then snack with protein\n\nIf unconscious → glucagon if available, 911.\n\n# Hyperglycemia (high)\n\n**Symptoms**: thirst, frequent urination, blurred vision, fatigue, fruity breath (DKA)\n→ Check per protocol, call MD if persistent or symptoms severe.`,
        [
          { question: "Treatment for hypoglycemia in an alert client is:", options: ["Insulin", "15 g fast-acting carb", "Water", "Wait it out"], correct_index: 1 },
        ]),
      L("foot-care", "Diabetic foot care",
        `# Foot care\n\n- Inspect feet **every visit** — top, bottom, between toes\n- Look for cuts, blisters, redness, calluses, ulcers\n- Never have HHAs cut toenails of diabetic clients\n- Apply lotion **but not between toes**\n- Well-fitting closed shoes; never barefoot\n\nNew ulcer or wound on a diabetic foot → call MD same day.`),
    ],
  },
  {
    slug: "pain-assessment",
    title: "Pain Assessment",
    summary: "Self-report, observational scales, and pain management documentation.",
    role_tags: ["nurse"],
    category: "Clinical",
    level: "intermediate",
    estimated_minutes: 20,
    cover_emoji: "💢",
    sort_order: 160,
    lessons: [
      L("scales", "Pain scales",
        `# Choosing a scale\n\n- **NRS (0–10)** — verbal, cognitively intact adults\n- **Wong-Baker FACES** — children, low-literacy adults\n- **PAINAD** — advanced dementia (observational): breathing, vocalization, facial expression, body language, consolability\n\nUse the same scale each visit so trends are comparable.`),
      L("documentation", "Document the OLD CARTS",
        `# OLD CARTS\n\n- **O**nset\n- **L**ocation\n- **D**uration\n- **C**haracter (sharp, dull, burning)\n- **A**ggravating factors\n- **R**elieving factors\n- **T**iming\n- **S**everity (0–10)\n\nDocument pre- and post-intervention scores to evaluate effectiveness.`,
        [
          { question: "Which scale is best for advanced dementia?", options: ["NRS", "PAINAD", "FACES", "Verbal"], correct_index: 1 },
        ]),
    ],
  },
  {
    slug: "oasis-overview",
    title: "OASIS Overview",
    summary: "What OASIS is, why it drives payment, and how to capture accurate data.",
    role_tags: ["nurse", "manager"],
    category: "Compliance",
    level: "advanced",
    estimated_minutes: 30,
    cover_emoji: "📊",
    sort_order: 170,
    lessons: [
      L("what", "What is OASIS?",
        `# Outcome and Assessment Information Set\n\nOASIS is the standardized assessment Medicare-certified home-health agencies must complete at:\n- Start of Care (SOC)\n- Resumption of Care (ROC)\n- Recertification (RFA-4)\n- Transfer / Discharge\n- Significant change in condition\n\nIt drives:\n- **Reimbursement** under PDGM\n- **Star ratings** publicly reported\n- **Quality measures**`),
      L("accuracy", "Accuracy & integrity",
        `# Get it right\n\n## Common pitfalls\n- Scoring "what the client tells you" without observing\n- Using "prior to home health" instead of day-of-assessment status\n- Inconsistencies between OASIS and visit notes\n- Failing to use the M0090 date correctly\n\nOASIS upcoding is **fraud**. Score what you actually assess, document evidence in the narrative, and follow the OASIS-E guidance manual.`),
    ],
  },
  {
    slug: "supervisory-visits",
    title: "Supervisory Visits",
    summary: "Conducting effective HHA supervisory visits that satisfy regulators.",
    role_tags: ["nurse", "manager"],
    category: "Compliance",
    level: "intermediate",
    estimated_minutes: 20,
    cover_emoji: "👁️",
    sort_order: 180,
    lessons: [
      L("structure", "Structure of a supervisory visit",
        `# What to cover\n\n1. Review the HHA care plan with the client\n2. Observe at least one ADL when the HHA is present (per state cadence)\n3. Solicit client feedback on care quality\n4. Verify documentation matches care delivered\n5. Provide coaching to the HHA\n6. Document on the supervisory visit form in CareWeaveHQ\n\nMissed supervisory visits are a top survey citation — track them on the Compliance Dashboard.`),
    ],
  },
];

// ============================================================
// MANAGER TRACK
// ============================================================

const managerCourses: SeedCourse[] = [
  {
    slug: "agency-ops-overview",
    title: "Agency Operations Overview",
    summary: "End-to-end view: intake → scheduling → EVV → billing → payroll → compliance.",
    role_tags: ["manager", "admin"],
    category: "Foundations",
    level: "beginner",
    estimated_minutes: 25,
    cover_emoji: "🏢",
    sort_order: 210,
    lessons: [
      L("lifecycle", "The agency lifecycle in CareWeaveHQ",
        `# End-to-end flow\n\n1. **Intake** — referral, eligibility check, consents (e-signatures)\n2. **Authorization** — capture payer, units, dates, diagnosis\n3. **Care plan** — RN builds the plan; HHA/nurse tasks defined\n4. **Scheduling** — match caregivers to visits by skill, geography, hours\n5. **EVV** — caregiver clocks in/out at the home; GPS verified\n6. **Documentation** — visit notes, ADLs, supervisory visits\n7. **Billing** — only **EVV-verified** hours generate invoices/claims\n8. **Remits** — 835 posts; AR aging tracked\n9. **Payroll** — caregiver pay computed from the same verified hours\n10. **Compliance** — credentials, training, supervisory visits monitored continuously\n\nThe **single source of truth** is the EVV-verified visit. Everything downstream — billing, payroll, compliance — flows from it.\n\n## Industry resources\n- [Alliance for Care at Home](https://allianceforcareathome.org) — national advocacy, legislative updates, and research for home care agencies`,
        [
          { question: "In CareWeaveHQ, billing and payroll use:", options: ["Scheduled hours", "Estimated hours", "EVV-verified hours", "Caregiver self-report"], correct_index: 2 },
        ]),
    ],
  },
  {
    slug: "scheduling-matching",
    title: "Scheduling & Caregiver Matching",
    summary: "Building stable, profitable schedules using skills, geography, continuity, and overtime control.",
    role_tags: ["manager", "scheduler"],
    category: "Operations",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "📅",
    sort_order: 220,
    lessons: [
      L("principles", "Matching principles",
        `# Smart matching\n\nPrioritize in this order:\n1. **Required skills/credentials** — non-negotiable (e.g., HHA cert, hoyer-trained)\n2. **Continuity** — same caregiver builds trust, reduces incidents\n3. **Geography** — minimize drive time; cluster visits\n4. **Caregiver preference** — overnight, weekends, gender match\n5. **Hours/OT impact** — protect the schedule from runaway overtime\n\nThe Scheduling Intel module surfaces open shifts and best-match caregivers.`),
      L("ot", "Overtime control",
        `# Overtime hygiene\n\n- Weekly hours dashboard — flag anyone approaching 40 (or your OT threshold)\n- Cap shifts the prior weekday so OT doesn't blow up Friday/Saturday\n- Maintain a per diem pool for last-minute fills\n- Track OT $ as a % of total payroll — target < 5%\n\nUnplanned OT is a top driver of margin erosion in home care.`),
    ],
  },
  {
    slug: "evv-compliance",
    title: "EVV Compliance & Reconciliation",
    summary: "21st Century Cures Act, state aggregators, and the reconciliation workflow.",
    role_tags: ["manager", "billing"],
    category: "Compliance",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "✅",
    sort_order: 230,
    lessons: [
      L("requirements", "Federal & state requirements",
        `# Cures Act EVV\n\nMandatory since:\n- **PCS (personal care)** — Jan 1, 2021\n- **HHCS (home health)** — Jan 1, 2024\n\nEach state chooses an EVV model: state-mandated vendor, MCO-choice, or open vendor. Many use **Sandata** or **HHAeXchange** as the aggregator.\n\nNon-compliance → reduced FMAP, denied claims.`),
      L("recon", "Daily reconciliation workflow",
        `# Reconciliation\n\nEvery morning, the EVV/billing lead should:\n1. Pull yesterday's visits with EVV exceptions (no clock-in, no clock-out, GPS variance, manual override)\n2. Investigate each — talk to the caregiver, review GPS\n3. Approve manual overrides with documented justification\n4. Re-submit corrected visits to the state aggregator\n5. Only then release for billing\n\nThe goal: **0 unresolved EVV exceptions** before the weekly billing run.`),
    ],
  },
  {
    slug: "billing-rcm",
    title: "Billing & Revenue Cycle Basics",
    summary: "From verified visit to paid claim: 837P, ERA/835, denials, aging.",
    role_tags: ["manager", "billing"],
    category: "Finance",
    level: "intermediate",
    estimated_minutes: 35,
    cover_emoji: "💵",
    sort_order: 240,
    lessons: [
      L("flow", "The RCM flow",
        `# Revenue Cycle\n\n1. **Verified visit** (EVV) → 2. **Pre-bill review** (auth, units, modifiers) → 3. **Claim build (837P)** → 4. **Clearinghouse** → 5. **Payer adjudication** → 6. **ERA/835 posting** → 7. **Patient/secondary** → 8. **AR follow-up**\n\nKPI targets:\n- Clean claim rate > 95%\n- Days sales outstanding (DSO) < 35\n- Denial rate < 5%\n- Net collection rate > 97%`),
      L("denials", "Working denials",
        `# Top denial reasons in home care\n\n- **CO-50** — non-covered service / no auth\n- **CO-29** — timely filing exceeded\n- **CO-16** — missing/invalid info\n- **CO-197** — pre-cert/auth missing\n- **CO-109** — wrong payer\n\nWork denials weekly, by reason code. Track root cause — most are fixable upstream (auth at intake, modifiers at scheduling).`,
        [
          { question: "CO-197 typically means:", options: ["Duplicate claim", "Missing authorization", "Patient deceased", "Wrong NPI"], correct_index: 1 },
        ]),
    ],
  },
  {
    slug: "payroll-fundamentals",
    title: "Payroll Fundamentals",
    summary: "EVV-driven payroll, OT, travel, PTO, and avoiding wage-and-hour claims.",
    role_tags: ["manager", "admin"],
    category: "Finance",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "💳",
    sort_order: 250,
    lessons: [
      L("evv-payroll", "Pay from EVV — not the schedule",
        `# Why EVV drives payroll\n\nIf payroll uses scheduled hours but billing uses EVV-verified hours, you will **always** have a discrepancy that either overpays caregivers or shorts them. CareWeaveHQ uses **EVV-verified hours** for both billing and payroll so the books reconcile.\n\nException workflow:\n- Missed clocks → manual override with supervisor approval\n- Disputes → caregiver signs the timesheet electronically before payroll lock\n- Locked invoiced visits cannot be edited — protect prior-period payroll integrity`),
      L("flsa", "FLSA, overtime & travel",
        `# Wage & hour\n\n- Most home-care workers are **non-exempt** → OT after 40 hrs/week (some states use daily OT > 8 hrs)\n- **Companionship exemption** narrowed after 2015 — assume OT applies\n- Travel **between** clients on the same day = compensable\n- Travel from home to first client / last client to home = generally **not** compensable\n- Sleep time, on-call rules vary by state\n\nConsult counsel for live-in and 24-hour shifts.`),
    ],
  },
  {
    slug: "hr-credentialing",
    title: "HR & Credentialing",
    summary: "Hiring, onboarding, exclusion screening, license tracking, terminations.",
    role_tags: ["manager", "admin"],
    category: "Operations",
    level: "intermediate",
    estimated_minutes: 30,
    cover_emoji: "🪪",
    sort_order: 260,
    lessons: [
      L("onboarding", "Onboarding checklist",
        `# Day-1 packet\n\n- I-9 + supporting docs\n- W-4 / state withholding\n- Direct deposit\n- Job description signed\n- Handbook acknowledgment\n- Confidentiality/HIPAA training & attestation\n- Bloodborne pathogens training\n- TB test, PPD, immunizations per state\n- Background check (state + FBI + child/elder abuse registry)\n- **OIG/SAM exclusion check** (mandatory monthly thereafter)\n- License/cert verification (primary source)\n- Skills competency check-off\n\nDocument everything in the Credentials module with expiry dates.`),
      L("exclusion", "OIG/SAM monthly screening",
        `# Why monthly?\n\nThe HHS OIG requires monthly exclusion screening. An excluded individual who provides items/services payable by federal healthcare programs creates **massive** liability:\n- Civil monetary penalties\n- Repayment of all amounts billed during exclusion\n- Possible False Claims Act exposure\n\nCareWeaveHQ runs automated monthly screens — review the report and document remediation for any hits.`,
        [
          { question: "How often should you screen staff against the OIG exclusion list?", options: ["Annually", "Quarterly", "Monthly", "Only at hire"], correct_index: 2 },
        ]),
    ],
  },
  {
    slug: "qa-incidents",
    title: "Quality Assurance & Incident Management",
    summary: "QAPI basics, incident reporting, root-cause, and survey readiness.",
    role_tags: ["manager"],
    category: "Compliance",
    level: "advanced",
    estimated_minutes: 30,
    cover_emoji: "🎯",
    sort_order: 270,
    lessons: [
      L("qapi", "QAPI program elements",
        `# QAPI (Quality Assessment & Performance Improvement)\n\nFive elements per CMS:\n1. **Design & scope** — data-driven, agency-wide\n2. **Governance & leadership** — QAPI committee, board accountability\n3. **Feedback, data systems & monitoring** — outcomes, satisfaction, adverse events\n4. **Performance improvement projects (PIPs)** — focused, measurable\n5. **Systematic analysis & systemic action** — root-cause, sustained change`),
      L("incident", "Incident reporting & root cause",
        `# When an incident happens\n\n1. Ensure client safety (call 911 if needed)\n2. Notify family, MD, agency leadership per policy\n3. Document factually within 24 hrs (incident report)\n4. **Root-cause analysis (5 Whys)** — what failed in the system, not who to blame\n5. Implement corrective action; track effectiveness over 90 days\n6. Aggregate trends quarterly for QAPI committee\n\nNever alter records after an incident — addenda only.`),
    ],
  },
  {
    slug: "leadership-coaching",
    title: "Leadership & Coaching",
    summary: "Engaging caregivers, reducing turnover, and difficult conversations.",
    role_tags: ["manager"],
    category: "People",
    level: "intermediate",
    estimated_minutes: 25,
    cover_emoji: "🌟",
    sort_order: 280,
    lessons: [
      L("retention", "Retention basics",
        `# Why caregivers leave\n\n- Inconsistent hours / unpredictable schedule\n- Poor communication from the office\n- Feeling unseen or disrespected\n- No path to grow (HHA → CNA → LPN)\n- Pay gaps with competitors\n\n## What helps\n- **First 90 days** matter most — buddy program, weekly check-ins\n- Schedule stability and continuity assignments\n- Recognition (peer, monetary, public)\n- Clear escalation channels — make office reachable\n- Career ladders and tuition support\n\n## Industry resources\n- [Alliance for Care at Home](https://allianceforcareathome.org) — caregiver recognition awards, workforce research, and retention benchmarks`),
      L("hard-talks", "Difficult conversations",
        `# A simple framework\n\n**SBI** — Situation, Behavior, Impact.\n\n> "In yesterday's 9 AM visit at Mrs. K's home (S), you clocked out 20 minutes before leaving (B). That created an EVV exception that delayed billing and made me question whether you were still on shift (I). What happened?"\n\nAsk open questions, listen, agree on the next step, and document. Be firm on the standard, kind on the person.`),
    ],
  },
];

export const STARTER_CURRICULUM: SeedCourse[] = [
  ...caregiverCourses,
  ...nurseCourses,
  ...managerCourses,
];