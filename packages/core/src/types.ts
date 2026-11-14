export const CHECK_IDS = [
  "missing_section",
  "missing_owner",
  "missing_approver",
  "missing_effective_date",
  "missing_last_reviewed",
  "missing_next_review",
  "stale_review",
  "placeholder_text",
  "duplicate_heading",
  "long_sentence",
  "undefined_acronym",
  "inconsistent_dates",
  "empty_section",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export type Severity = "high" | "medium" | "low";

export interface SectionSpec {
  id: string;
  label: string;
  required: boolean;
  /** Heading phrases that count as this section. Matching is exact, not a loose search. */
  patterns: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  sections: SectionSpec[];
  /** Used when analyze() is not given an explicit stale-review window. */
  staleReviewMonths?: number;
}

export interface Finding {
  id: string;
  checkId: CheckId;
  severity: Severity;
  title: string;
  detail: string;
  excerpt?: string;
  line?: number;
  howToFix: string;
}

export interface SectionResult {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
  empty: boolean;
  matchedHeading?: string;
  line?: number;
}

export interface MetadataField {
  value: string;
  /** ISO date (YYYY-MM-DD) when the value contains a date we could read. */
  date?: string;
  line: number;
}

export interface DocumentMetadata {
  owner?: MetadataField;
  approver?: MetadataField;
  effectiveDate?: MetadataField;
  lastReviewed?: MetadataField;
  nextReview?: MetadataField;
}

export type ScoreCategory = "sections" | "metadata" | "quality";

export interface Deduction {
  category: ScoreCategory;
  label: string;
  points: number;
}

export interface ScoreBreakdown {
  sections: number;
  metadata: number;
  quality: number;
  total: number;
  sectionBudget: number;
  metadataBudget: number;
  qualityBudget: number;
  deductions: Deduction[];
  /** True when itemised points were limited by the category budget. */
  capped: {
    metadata: boolean;
    quality: boolean;
  };
}

export interface AnalysisStats {
  words: number;
  characters: number;
  headings: number;
  sentences: number;
  longSentences: number;
}

export interface Analysis {
  templateId: string;
  templateName: string;
  referenceDate: string;
  staleReviewMonths: number;
  sections: SectionResult[];
  metadata: DocumentMetadata;
  findings: Finding[];
  score: ScoreBreakdown;
  stats: AnalysisStats;
}

export interface AnalyzeOptions {
  /** Template id or a full template object. Defaults to the healthcare checklist. */
  template?: Template | string;
  /** Date the check is performed. Defaults to today (UTC). */
  referenceDate?: Date | string;
  /** Review is stale when last reviewed is strictly older than this many months. */
  staleReviewMonths?: number;
  /** Sentences with more words than this are flagged. Default 40. */
  longSentenceWords?: number;
}

export interface CheckExplanation {
  checkId: CheckId;
  title: string;
  looksFor: string;
  whyItMatters: string;
  howToFix: string;
}
