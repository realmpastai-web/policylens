export { analyzeDocument } from "./analyze.ts";
export { formatIso, isOlderThanMonths, parseDate, startOfUtcDay } from "./dates.ts";
export { explainCheck, listCheckExplanations } from "./explain.ts";
export { findHeadings, normalizeHeading } from "./headings.ts";
export {
  SECTION_BUDGET,
  METADATA_BUDGET,
  QUALITY_BUDGET,
  sectionDeduction,
} from "./score.ts";
export {
  assertTemplate,
  builtInTemplates,
  cloneTemplate,
  getTemplate,
  listTemplates,
} from "./templates.ts";
export { CHECK_IDS } from "./types.ts";
export type {
  Analysis,
  AnalysisStats,
  AnalyzeOptions,
  CheckExplanation,
  CheckId,
  Deduction,
  DocumentMetadata,
  Finding,
  MetadataField,
  ScoreBreakdown,
  ScoreCategory,
  SectionResult,
  SectionSpec,
  Severity,
  Template,
} from "./types.ts";
