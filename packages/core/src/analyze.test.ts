import { describe, expect, it } from "vitest";
import { analyzeDocument } from "./analyze.ts";
import { isOlderThanMonths, parseDate } from "./dates.ts";
import { explainCheck } from "./explain.ts";
import { getTemplate } from "./templates.ts";
import type { Analysis, CheckId, Template } from "./types.ts";

const REFERENCE = "2026-06-01";

function checks(analysis: Analysis): CheckId[] {
  return [...new Set(analysis.findings.map((finding) => finding.checkId))];
}

function has(analysis: Analysis, checkId: CheckId): boolean {
  return analysis.findings.some((finding) => finding.checkId === checkId);
}

const CLEAN = `
Medication Handling Policy

Owner: Avery Chen
Approver: Jordan Blake
Effective Date: March 1, 2026
Last Reviewed: 2026-03-01
Next Review: 2027-03-01

## Purpose
This policy sets the rules for handling medication on a ward.

## Scope
The policy applies to nursing and pharmacy staff on inpatient wards.

## Policy
Staff store medication in a locked cupboard and record each dose.

## Procedure
Staff confirm the name and the dose, then record the administration.

## Responsibilities
The charge nurse reviews the record at the end of each shift.

## Definitions
No specialised abbreviations are required in this document.

## References
See the local medication chart standard for the record format.

## Approval and revision history
Version 1.0 was approved by Jordan Blake on the effective date.
`;

describe("parseDate", () => {
  it("reads ISO, written, and month/day/year dates", () => {
    expect(parseDate("2026-03-01")?.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(parseDate("March 1, 2026")?.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(parseDate("1 March 2026")?.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(parseDate("03/01/2026")?.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(parseDate("2026-02-31")).toBeNull();
    expect(parseDate("February 31, 2026")).toBeNull();
  });

  it("treats the anniversary of a 12-month window as current", () => {
    const reviewed = parseDate("2025-06-01")!;
    const reference = parseDate("2026-06-01")!;
    const dayBefore = parseDate("2025-05-31")!;
    expect(isOlderThanMonths(reviewed, reference, 12)).toBe(false);
    expect(isOlderThanMonths(dayBefore, reference, 12)).toBe(true);
  });
});

describe("analyzeDocument", () => {
  it("scores a complete current policy at 100", () => {
    const analysis = analyzeDocument(CLEAN, { referenceDate: REFERENCE, template: "healthcare" });
    expect(analysis.score.total).toBe(100);
    expect(analysis.findings).toEqual([]);
    expect(analysis.metadata.owner?.value).toBe("Avery Chen");
    expect(analysis.metadata.effectiveDate?.date).toBe("2026-03-01");
    expect(analysis.sections.filter((section) => section.required && section.present)).toHaveLength(8);
  });

  it("flags each missing required section and deducts five points for one of eight", () => {
    const text = CLEAN.replace("## Responsibilities\nThe charge nurse reviews the record at the end of each shift.\n", "");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(has(analysis, "missing_section")).toBe(true);
    expect(analysis.findings.filter((item) => item.checkId === "missing_section").map((item) => item.title)).toEqual([
      "Missing section: Responsibilities",
    ]);
    expect(analysis.score.sections).toBe(35);
    expect(analysis.score.total).toBe(95);
  });

  it("reads numbered headings and all-caps headings", () => {
    const text = `
Owner: Avery Chen
Approved by: Jordan Blake
Effective: 2026-03-01
Last reviewed: 2026-03-01
Next review: 2027-03-01

1. PURPOSE
This document states why the visitor rule exists.

SCOPE
The rule applies to every public entrance of the clinic.

POLICY STATEMENT
Visitors sign in before they enter a care area.

3. Procedure
The desk checks the name and issues a badge.

Roles and responsibilities
The desk lead keeps the sign-in book for the shift.

Definitions
No specialised abbreviations are required here.

Related documents
See the building access standard for the badge colours.

Approval
The operations lead approved version 1.0 on the effective date.
`;
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE, template: "sop" });
    expect(analysis.sections.filter((section) => section.required && !section.present).map((section) => section.id)).toEqual(
      [],
    );
    expect(analysis.score.total).toBe(100);
  });

  it("reads metadata from a table and from bold labels", () => {
    const analysis = analyzeDocument(
      `
| Policy owner | Sam Patel |
| **Approved by** | Riley Quinn |
| Effective Date | March 1, 2026 |
| Last Reviewed | 2026-03-01 |
| Next Review Date | 2027-03-01 |

## Purpose
State the rule for badge return at the end of a shift.

## Scope
Applies to staff who hold a building badge.

## Policy
Badges stay on site when the shift ends.

## Procedure
Leave the badge in the tray by the desk.

## Responsibilities
Security empties the tray each night.

## Definitions
No specialised abbreviations are required here.

## References
See the badge standard for the tray location.

## Revision history
Version 1.0 is the first approved copy.
`,
      { referenceDate: REFERENCE },
    );
    expect(analysis.metadata.owner?.value).toBe("Sam Patel");
    expect(analysis.metadata.approver?.value).toBe("Riley Quinn");
    expect(analysis.score.total).toBe(100);
  });

  it("flags a stale review and does not also call the date missing", () => {
    const text = CLEAN.replace("Last Reviewed: 2026-03-01", "Last Reviewed: 2024-01-15");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE, staleReviewMonths: 12 });
    expect(has(analysis, "stale_review")).toBe(true);
    expect(has(analysis, "missing_last_reviewed")).toBe(false);
    expect(analysis.score.metadata).toBe(20);
    expect(analysis.score.total).toBe(90);
  });

  it("does not flag a review on the twelve-month anniversary", () => {
    const text = CLEAN.replace("Last Reviewed: 2026-03-01", "Last Reviewed: 2025-06-01");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE, staleReviewMonths: 12 });
    expect(has(analysis, "stale_review")).toBe(false);
    expect(analysis.score.total).toBe(100);
  });

  it("treats TBD as a missing owner and as placeholder text", () => {
    const text = CLEAN.replace("Owner: Avery Chen", "Owner: TBD").replace(
      "Staff confirm the name and the dose, then record the administration.",
      "Staff confirm the name and the dose. [insert site] lorem ipsum dolor sit amet, then record it.",
    );
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(has(analysis, "missing_owner")).toBe(true);
    expect(analysis.metadata.owner).toBeUndefined();
    const placeholders = analysis.findings.filter((item) => item.checkId === "placeholder_text");
    expect(placeholders.map((item) => item.excerpt).sort()).toEqual(["TBD", "[insert site]", "lorem ipsum"].sort());
    expect(analysis.score.metadata).toBe(22);
    expect(analysis.score.quality).toBe(21);
  });

  it("flags undefined acronyms and accepts an expansion", () => {
    const text = `${CLEAN}\nThe ward uses a local EHR for the chart and a virtual private network (VPN) for remote access.\n`;
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    const acronyms = analysis.findings.filter((item) => item.checkId === "undefined_acronym");
    expect(acronyms.map((item) => item.excerpt)).toEqual(["EHR"]);
  });

  it("flags duplicate headings and an empty section", () => {
    const text = CLEAN.replace(
      "## Scope\nThe policy applies to nursing and pharmacy staff on inpatient wards.",
      "## Scope\n\n## Procedure\nCount the stock a second time and note any gap.",
    );
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(has(analysis, "empty_section")).toBe(true);
    expect(has(analysis, "duplicate_heading")).toBe(true);
    expect(analysis.sections.find((section) => section.id === "scope")?.empty).toBe(true);
  });

  it("flags conflicting and impossible dates", () => {
    const text = CLEAN.replace("Effective Date: March 1, 2026", "Effective Date: 2026-08-01\nEffective Date: 2025-01-01").replace(
      "Next Review: 2027-03-01",
      "Next Review: 2026-01-01",
    );
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(has(analysis, "inconsistent_dates")).toBe(true);
    expect(analysis.findings.filter((item) => item.checkId === "inconsistent_dates").length).toBeGreaterThanOrEqual(2);
    expect(analysis.score.quality).toBe(22);
  });

  it("flags a next review date that has already passed", () => {
    const text = CLEAN.replace("Next Review: 2027-03-01", "Next Review: 2026-05-01");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(analysis.findings.some((item) => item.title === "Next review date has passed")).toBe(true);
    expect(has(analysis, "inconsistent_dates")).toBe(false);
    expect(analysis.score.metadata).toBe(20);
    expect(analysis.score.total).toBe(90);
  });

  it("flags a last-reviewed date after the check date", () => {
    const text = CLEAN.replace("Last Reviewed: 2026-03-01", "Last Reviewed: 2026-12-01");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(analysis.findings.some((item) => item.title === "Last review is in the future")).toBe(true);
  });

  it("flags a sentence over 40 words", () => {
    const long =
      "Staff confirm the patient name and the dose and the route and the time and the witness and the chart and the cupboard and the key and the waste bin and the label and the expiry and the barcode and the second checker before they record the administration in the book.";
    expect(long.split(/\s+/).length).toBeGreaterThan(40);
    const text = CLEAN.replace("Staff confirm the name and the dose, then record the administration.", long);
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(has(analysis, "long_sentence")).toBe(true);
    expect(analysis.score.quality).toBe(28);
  });

  it("zeroes metadata when every owner and date is absent", () => {
    const text = CLEAN.replace(/^(Owner|Approver|Effective Date|Last Reviewed|Next Review):.*$/gm, "");
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(checks(analysis).sort()).toEqual(
      [
        "missing_approver",
        "missing_effective_date",
        "missing_last_reviewed",
        "missing_next_review",
        "missing_owner",
      ].sort(),
    );
    expect(analysis.score.metadata).toBe(0);
    expect(analysis.score.total).toBe(70);
    expect(analysis.score.capped.metadata).toBe(false);
  });

  it("caps quality deductions at 30", () => {
    const text = `
## Purpose
TBD TODO FIXME XXX lorem ipsum [insert here] ___ ___

## Purpose
Short.

## Scope

## Policy

## Procedure
${"word ".repeat(50)}

## Responsibilities

## Definitions
The EHR and the PHI and the MRSA and the CPOE and the BCMA remain unexplained here today.

## References

## Approval
`;
    const analysis = analyzeDocument(text, { referenceDate: REFERENCE });
    expect(analysis.score.quality).toBe(0);
    expect(analysis.score.capped.quality).toBe(true);
    expect(analysis.score.total).toBeGreaterThanOrEqual(0);
    expect(analysis.score.total).toBeLessThanOrEqual(100);
  });

  it("accepts a custom template object and rejects an unknown id", () => {
    const template: Template = {
      id: "lab",
      name: "Lab note",
      description: "One section.",
      builtIn: false,
      sections: [{ id: "purpose", label: "Purpose", required: true, patterns: ["purpose"] }],
    };
    const analysis = analyzeDocument("Purpose\nThis note explains the bench check for the morning run.\n", {
      template,
      referenceDate: REFERENCE,
    });
    expect(analysis.templateId).toBe("lab");
    expect(has(analysis, "missing_section")).toBe(false);
    expect(() => analyzeDocument("Hello", { template: "nope" })).toThrow(/Unknown template/);
  });

  it("explains every check id", () => {
    const explanation = explainCheck("stale_review");
    expect(explanation?.howToFix.length).toBeGreaterThan(10);
    expect(explainCheck("not-a-check")).toBeNull();
    expect(getTemplate("it-security").name).toBe("IT security policy");
  });
});
