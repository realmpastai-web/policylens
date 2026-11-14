export interface EvalCase {
  id: string;
  title: string;
  templateId: string;
  referenceDate: string;
  checks: string[];
  scoreMin: number;
  scoreMax: number;
  text: string;
}

interface Block {
  heading: string;
  body: string;
}

function document(options: {
  title: string;
  lines?: string[];
  blocks: Block[];
  style?: "markdown" | "plain" | "numbered" | "caps";
  footer?: string;
}): string {
  const style = options.style ?? "markdown";
  const chunks: string[] = [options.title, ""];
  if (options.lines && options.lines.length > 0) {
    chunks.push(...options.lines, "");
  }
  options.blocks.forEach((block, index) => {
    if (style === "markdown") chunks.push(`## ${block.heading}`);
    else if (style === "numbered") chunks.push(`${index + 1}. ${block.heading}`);
    else if (style === "caps") chunks.push(block.heading.toUpperCase());
    else chunks.push(block.heading);
    if (block.body.trim()) chunks.push(block.body.trim());
    chunks.push("");
  });
  if (options.footer) chunks.push(options.footer);
  return chunks.join("\n").trim() + "\n";
}

const META = [
  "Owner: Avery Chen",
  "Approver: Jordan Blake",
  "Effective Date: 2026-03-01",
  "Last Reviewed: 2026-03-01",
  "Next Review: 2027-03-01",
];

function standard(topic: Record<string, string>, extras: Block[] = []): Block[] {
  return [
    { heading: "Purpose", body: topic.purpose ?? "" },
    { heading: "Scope", body: topic.scope ?? "" },
    { heading: "Policy", body: topic.policy ?? "" },
    { heading: "Procedure", body: topic.procedure ?? "" },
    { heading: "Responsibilities", body: topic.responsibilities ?? "" },
    { heading: "Definitions", body: topic.definitions ?? "" },
    { heading: "References", body: topic.references ?? "" },
    { heading: "Approval", body: topic.approval ?? "" },
    ...extras,
  ];
}

const visitor = {
  purpose: "This document states the rule for visitor sign-in at the clinic.",
  scope: "The rule applies to the front desk and the side entrance.",
  policy: "Every visitor signs the book before entering a care area.",
  procedure: "The desk checks the name and writes the arrival time.",
  responsibilities: "The desk lead keeps the book for the whole shift.",
  definitions: "No specialised abbreviations are required in this document.",
  references: "See the building access standard for the book layout.",
  approval: "The operations lead approved version 1 on the effective date.",
};

export const cases: EvalCase[] = [
  {
    id: "01-clean-healthcare",
    title: "Complete healthcare policy with written dates",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: [],
    scoreMin: 100,
    scoreMax: 100,
    text: document({
      title: "Visitor sign-in",
      lines: [
        "Owner: Avery Chen",
        "Approver: Jordan Blake",
        "Effective Date: March 1, 2026",
        "Last Reviewed: March 1, 2026",
        "Next Review: March 1, 2027",
      ],
      blocks: standard(visitor),
    }),
  },
  {
    id: "02-clean-sop",
    title: "Complete SOP with a materials section",
    templateId: "sop",
    referenceDate: "2026-06-01",
    checks: [],
    scoreMin: 100,
    scoreMax: 100,
    text: document({
      title: "Badge return at the end of a shift",
      lines: META,
      blocks: standard(
        {
          purpose: "This procedure states how staff return a building badge.",
          scope: "It applies to anyone who holds a badge for the clinic building.",
          policy: "Badges stay on site when the shift ends.",
          procedure: "Leave the badge in the tray by the desk before you exit.",
          responsibilities: "Security empties the tray at the end of each night.",
          definitions: "No specialised abbreviations are required in this document.",
          references: "See the badge standard for the tray location.",
          approval: "The operations lead approved version 1 on the effective date.",
        },
        [{ heading: "Materials", body: "The desk keeps a spare tray and a spare log book." }],
      ),
    }),
  },
  {
    id: "03-missing-sections-it",
    title: "IT security policy missing three required sections",
    templateId: "it-security",
    referenceDate: "2026-06-01",
    checks: ["missing_section"],
    scoreMin: 70,
    scoreMax: 90,
    text: document({
      title: "Passphrase handling",
      style: "numbered",
      lines: [
        "Owner: Sam Patel",
        "Approver: Riley Quinn",
        "Effective Date: 2026-03-01",
        "Last Reviewed: 2026-03-01",
        "Next Review: 2027-03-01",
      ],
      blocks: [
        { heading: "Purpose", body: "This policy states how staff choose and store a passphrase." },
        { heading: "Scope", body: "It applies to staff who sign in to a clinic workstation." },
        { heading: "Policy", body: "Staff choose a long passphrase and do not share it." },
        { heading: "Procedure", body: "Create the passphrase, store it in the approved locker, and do not write it down." },
        { heading: "Responsibilities", body: "The service desk resets a passphrase after a confirmed request." },
      ],
    }),
  },
  {
    id: "04-stale-and-missing-owner",
    title: "Healthcare policy with a stale review and no owner",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: ["missing_owner", "stale_review"],
    scoreMin: 70,
    scoreMax: 90,
    text: document({
      title: "Medication cupboard check",
      lines: [
        "Approver: Jordan Blake",
        "Effective Date: 2024-01-15",
        "Last Reviewed: 2024-01-15",
        "Next Review: 2027-03-01",
      ],
      blocks: standard({
        purpose: "This policy states how the ward checks the medication cupboard.",
        scope: "It applies to nursing staff on the inpatient ward.",
        policy: "A named nurse checks the cupboard at the start of each shift.",
        procedure: "Count the stock, lock the door, and sign the sheet.",
        responsibilities: "The charge nurse reviews the sheet at the end of the shift.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the cupboard log for the sheet layout.",
        approval: "The nursing lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "05-placeholders",
    title: "SOP that still contains draft placeholders",
    templateId: "sop",
    referenceDate: "2026-06-01",
    checks: ["placeholder_text"],
    scoreMin: 80,
    scoreMax: 99,
    text: document({
      title: "Incident form completion",
      lines: META,
      blocks: standard({
        purpose: "This procedure states how staff complete an incident form.",
        scope: "It applies to the shift that discovers the incident.",
        policy: "The form is finished before the shift ends.",
        procedure:
          "Complete the [insert site] form before the shift ends. TBD items stay off the form. Remove any lorem ipsum draft and any XXX mark.",
        responsibilities: "The shift lead reads the form before it is filed.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the incident file standard for the form number.",
        approval: "The operations lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "06-undefined-acronyms",
    title: "IT security policy with two undefined acronyms",
    templateId: "it-security",
    referenceDate: "2026-06-01",
    checks: ["undefined_acronym"],
    scoreMin: 85,
    scoreMax: 99,
    text: document({
      title: "After-hours access alerts",
      lines: [
        "Owner: Casey Ng",
        "Approver: Drew Shah",
        "Effective Date: 2026-03-01",
        "Last Reviewed: 2026-03-01",
        "Next Review: 2027-03-01",
      ],
      blocks: standard({
        purpose: "This policy states how after-hours access alerts are handled.",
        scope: "It applies to the on-call lead and the service desk.",
        policy: "Staff use MFA at each login to the alert console.",
        procedure: "Alerts go to the SIEM before the on-call lead is paged.",
        responsibilities: "The on-call lead confirms the alert within the shift.",
        definitions: "No other specialised terms are defined in this document.",
        references: "Remote staff connect through a virtual private network (VPN).",
        approval: "The security lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "07-duplicate-and-empty",
    title: "SOP with an empty scope and a repeated procedure heading",
    templateId: "sop",
    referenceDate: "2026-06-01",
    checks: ["duplicate_heading", "empty_section"],
    scoreMin: 70,
    scoreMax: 95,
    text: document({
      title: "Stock count for the supply room",
      lines: META,
      blocks: [
        { heading: "Purpose", body: "This procedure states how staff count supply-room stock." },
        { heading: "Scope", body: "" },
        { heading: "Policy", body: "The count happens at the open and the close of the day." },
        { heading: "Procedure", body: "Count the stock at the start of the shift and note any gap." },
        { heading: "Procedure", body: "Count the stock at the end of the shift and note any gap." },
        { heading: "Responsibilities", body: "The room lead signs both counts." },
        { heading: "Definitions", body: "No specialised abbreviations are required in this document." },
        { heading: "References", body: "See the stock sheet for the column layout." },
        { heading: "Approval", body: "The operations lead approved version 1 on the effective date." },
      ],
    }),
  },
  {
    id: "08-inconsistent-dates",
    title: "Policy with two different effective dates",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: ["inconsistent_dates"],
    scoreMin: 80,
    scoreMax: 99,
    text: document({
      title: "Equipment loan",
      lines: [
        "Owner: Avery Chen",
        "Approver: Jordan Blake",
        "Effective Date: 2026-03-01",
        "Effective Date: 2025-01-01",
        "Last Reviewed: 2026-03-01",
        "Next Review: 2027-03-01",
      ],
      blocks: standard({
        purpose: "This policy states how the clinic loans a piece of equipment.",
        scope: "It applies to the clinic that owns the item and the clinic that borrows it.",
        policy: "A loan is written down before the item leaves the building.",
        procedure: "Record the item, the borrower, and the return date.",
        responsibilities: "The store lead checks the return on the due date.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the loan log for the column layout.",
        approval: "The operations lead approved version 1 on the first effective date.",
      }),
    }),
  },
  {
    id: "09-long-sentence",
    title: "Healthcare policy with one very long instruction",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: ["long_sentence"],
    scoreMin: 85,
    scoreMax: 99,
    text: document({
      title: "Dose recording",
      lines: META,
      blocks: standard({
        ...visitor,
        purpose: "This policy states how a nurse records a dose.",
        scope: "It applies to nurses who give medication on the ward.",
        policy: "Every dose is recorded before the nurse leaves the room.",
        procedure:
          "The nurse confirms the name and the wristband and the dose and the route and the time and the chart and the prescriber and the allergy band and the second checker and the waste bin and the label before recording the dose in the book.",
        responsibilities: "The charge nurse reviews the book at the end of the shift.",
        references: "See the medication chart standard for the column layout.",
        approval: "The nursing lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "10-missing-metadata",
    title: "Policy with sections and no owner or dates",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: [
      "missing_approver",
      "missing_effective_date",
      "missing_last_reviewed",
      "missing_next_review",
      "missing_owner",
    ],
    scoreMin: 70,
    scoreMax: 70,
    text: document({
      title: "Waste bin emptying",
      blocks: standard({
        purpose: "This policy states when a clinical waste bin is emptied.",
        scope: "It applies to the ward that fills the bin.",
        policy: "A full bin is closed and replaced before the next shift.",
        procedure: "Close the lid, tag the bin, and call the collection desk.",
        responsibilities: "The shift lead confirms the tag before the bin is moved.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the waste standard for the tag colour.",
        approval: "Version 1 is the working copy of this rule.",
      }),
    }),
  },
  {
    id: "11-review-anniversary",
    title: "Review dated exactly twelve months before the check",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: [],
    scoreMin: 100,
    scoreMax: 100,
    text: document({
      title: "Linen change",
      lines: [
        "Owner: Rowan Kim",
        "Approver: Ellis Park",
        "Effective Date: 2025-06-01",
        "Last Reviewed: 2025-06-01",
        "Next Review: 2027-03-01",
      ],
      blocks: standard({
        purpose: "This policy states when bed linen is changed.",
        scope: "It applies to inpatient beds in the clinic.",
        policy: "Linen is changed after each discharge and when it is soiled.",
        procedure: "Remove the linen, bag it, and fit a clean set.",
        responsibilities: "The ward aide signs the linen tally each evening.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the linen tally for the bag colour.",
        approval: "The ward lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "12-empty-definitions",
    title: "Definitions heading present but only a placeholder",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: ["empty_section", "placeholder_text"],
    scoreMin: 70,
    scoreMax: 95,
    text: document({
      title: "Consent conversation",
      lines: META,
      blocks: standard({
        purpose: "This policy states how staff record a consent conversation.",
        scope: "It applies to the clinician who recommends a procedure.",
        policy: "The conversation is written in the chart on the same day.",
        procedure: "State the procedure, the risks you discussed, and the decision.",
        responsibilities: "The clinician who held the conversation writes the note.",
        definitions: "TBD",
        references: "See the chart standard for the note heading.",
        approval: "The medical lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "13-plain-headings",
    title: "Healthcare policy whose headings are plain lines",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: [],
    scoreMin: 100,
    scoreMax: 100,
    text: document({
      title: "Meal service on the ward",
      style: "plain",
      lines: META,
      blocks: standard({
        purpose: "This policy states how meals are served on the ward.",
        scope: "It applies to the meal trolley and the patients on that ward.",
        policy: "A meal is served only after the name on the tray is checked.",
        procedure: "Read the name, check the diet card, and leave the tray.",
        responsibilities: "The ward host signs the meal sheet at the end of service.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the diet card standard for the colour codes.",
        approval: "The ward lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "14-future-last-reviewed",
    title: "Last reviewed date is after the check date",
    templateId: "sop",
    referenceDate: "2026-06-01",
    checks: ["inconsistent_dates"],
    scoreMin: 80,
    scoreMax: 99,
    text: document({
      title: "Fire drill attendance",
      lines: [
        "Owner: Quinn Alvarez",
        "Approver: Riley Quinn",
        "Effective Date: 2026-03-01",
        "Last Reviewed: 2026-12-01",
        "Next Review: 2027-06-01",
      ],
      blocks: standard({
        purpose: "This procedure states how drill attendance is recorded.",
        scope: "It applies to staff who work in the building on drill day.",
        policy: "Attendance is recorded before the all-clear is given.",
        procedure: "Mark the roll, note absences, and file the sheet.",
        responsibilities: "The floor warden keeps the sheet for that drill.",
        definitions: "No specialised abbreviations are required in this document.",
        references: "See the drill sheet for the column layout.",
        approval: "The safety lead approved version 1 on the effective date.",
      }),
    }),
  },
  {
    id: "15-mixed-healthcare",
    title: "Healthcare draft with several independent gaps",
    templateId: "healthcare",
    referenceDate: "2026-06-01",
    checks: ["missing_section", "placeholder_text", "stale_review", "undefined_acronym"],
    scoreMin: 40,
    scoreMax: 85,
    text: document({
      title: "Printing a chart",
      lines: [
        "Owner: Morgan Lee",
        "Approver: Jordan Blake",
        "Effective Date: 2024-01-15",
        "Last Reviewed: 2024-06-01",
        "Next Review: 2027-06-01",
      ],
      blocks: [
        { heading: "Purpose", body: "This policy states when staff may print a chart." },
        { heading: "Scope", body: "It applies to staff who print from the ward workstation." },
        { heading: "Policy", body: "A chart is printed only for the current episode of care." },
        {
          heading: "Procedure",
          body: "Staff protect PHI when they print a chart, and they collect the pages at once.",
        },
        { heading: "Definitions", body: "No other specialised terms are defined in this document." },
        { heading: "References", body: "The companion chart standard is listed here. XXX" },
        { heading: "Approval", body: "The nursing lead approved version 1 on the effective date." },
      ],
    }),
  },
];
