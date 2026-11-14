import type { CheckExplanation, CheckId } from "./types.ts";
import { CHECK_IDS } from "./types.ts";

const EXPLANATIONS: Record<CheckId, CheckExplanation> = {
  missing_section: {
    checkId: "missing_section",
    title: "Missing required section",
    looksFor:
      "A heading that matches the checklist, such as Purpose, Scope, Policy, Procedure, Responsibilities, Definitions, References, or Approval / revision history.",
    whyItMatters:
      "Reviewers look for these sections so a policy says why it exists, who it covers, the rule, the steps, and who keeps it current.",
    howToFix: "Add the heading and a short section under it. A heading with no body is reported separately as empty.",
  },
  missing_owner: {
    checkId: "missing_owner",
    title: "Missing owner",
    looksFor: "A line labeled Owner, Policy owner, or Document owner.",
    whyItMatters: "Someone has to answer for the document when a review finds a gap.",
    howToFix: "Add a line such as “Owner: Name”. A value of TBD or [insert] does not count.",
  },
  missing_approver: {
    checkId: "missing_approver",
    title: "Missing approver",
    looksFor: "A line labeled Approver, Approved by, or Approval authority.",
    whyItMatters: "Approval shows the document was accepted, not only drafted.",
    howToFix: "Add a line such as “Approved by: Name”.",
  },
  missing_effective_date: {
    checkId: "missing_effective_date",
    title: "Missing effective date",
    looksFor: "A line labeled Effective date, Effective, or Effective from, with a date.",
    whyItMatters: "Staff need to know when the rule starts.",
    howToFix: "Add a date in ISO form (2026-03-01) or a written form (March 1, 2026). Numeric dates are read as month/day/year.",
  },
  missing_last_reviewed: {
    checkId: "missing_last_reviewed",
    title: "Missing last reviewed date",
    looksFor: "A line labeled Last reviewed, Last review date, Reviewed on, or Review date.",
    whyItMatters: "Without a review date, a stale document looks the same as a current one.",
    howToFix: "Add the date of the last real review, not the original draft date unless they are the same.",
  },
  missing_next_review: {
    checkId: "missing_next_review",
    title: "Missing next review date",
    looksFor: "A line labeled Next review, Next review date, or Review due.",
    whyItMatters: "A next review date is what puts the document back on a calendar.",
    howToFix: "Add the date the owner should review it again.",
  },
  stale_review: {
    checkId: "stale_review",
    title: "Stale review",
    looksFor:
      "A last-reviewed date older than the configured window, or a next review date already before the check date. The default window is 12 months, and the anniversary day itself is still current.",
    whyItMatters:
      "Regulated teams usually re-review controlled documents on a set cycle. A date past that cycle, or a next review that has already passed, is review debt.",
    howToFix:
      "Review the document and update Last reviewed and Next review, or record why the cycle is longer and raise the window for this check.",
  },
  placeholder_text: {
    checkId: "placeholder_text",
    title: "Placeholder text",
    looksFor: "TBD, TBA, XXX, TODO, FIXME, lorem ipsum, [insert …], [placeholder …], or a blank written as three or more underscores.",
    whyItMatters: "Placeholder text means a required decision was never filled in.",
    howToFix: "Replace the marker with the real name, date, or step, or delete the sentence.",
  },
  duplicate_heading: {
    checkId: "duplicate_heading",
    title: "Duplicate heading",
    looksFor: "The same heading text more than once, ignoring case, numbering, and punctuation.",
    whyItMatters: "Repeated headings make it unclear which block is the controlled section.",
    howToFix: "Merge the sections or rename the second heading so each title is unique.",
  },
  long_sentence: {
    checkId: "long_sentence",
    title: "Very long sentence",
    looksFor: "A sentence longer than the configured word limit (default 40).",
    whyItMatters: "Long sentences hide the step someone is supposed to follow.",
    howToFix: "Split the sentence at the point where a second action or condition starts.",
  },
  undefined_acronym: {
    checkId: "undefined_acronym",
    title: "Undefined acronym",
    looksFor:
      "A run of 2–6 capital letters in body text that is never expanded. File formats and a short allow list (US, UK, QA, and similar) are ignored.",
    whyItMatters: "Readers outside the drafting team cannot tell whether two acronyms mean the same control.",
    howToFix:
      "Expand the first use, for example “electronic health record (EHR)”, or add a line in Definitions such as “EHR: electronic health record”.",
  },
  inconsistent_dates: {
    checkId: "inconsistent_dates",
    title: "Inconsistent dates",
    looksFor:
      "The same date field with two different values, an effective date after the next review, a last review after the next review, or a last review in the future.",
    whyItMatters: "Conflicting dates make the review cycle impossible to audit.",
    howToFix: "Keep one date per field and order them so effective, last reviewed, and next review can all be true on the check date.",
  },
  empty_section: {
    checkId: "empty_section",
    title: "Empty section",
    looksFor: "A recognised heading whose body has fewer than five words before the next heading.",
    whyItMatters: "A heading with nothing under it reads as finished when the content was never written.",
    howToFix: "Write the section, or remove the heading if it does not apply.",
  },
};

export function explainCheck(checkId: string): CheckExplanation | null {
  if (!CHECK_IDS.includes(checkId as CheckId)) return null;
  return EXPLANATIONS[checkId as CheckId];
}

export function listCheckExplanations(): CheckExplanation[] {
  return CHECK_IDS.map((id) => EXPLANATIONS[id]);
}

export function howToFix(checkId: CheckId): string {
  return EXPLANATIONS[checkId].howToFix;
}
