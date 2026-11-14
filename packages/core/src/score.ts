import type { CheckId, Deduction, ScoreBreakdown } from "./types.ts";

export const SECTION_BUDGET = 40;
export const METADATA_BUDGET = 30;
export const QUALITY_BUDGET = 30;

export const METADATA_POINTS: Partial<Record<CheckId, number>> = {
  missing_owner: 8,
  missing_approver: 6,
  missing_effective_date: 6,
  missing_last_reviewed: 6,
  missing_next_review: 4,
  stale_review: 10,
};

export function sectionDeduction(required: number, missing: number): number {
  if (required <= 0 || missing <= 0) return 0;
  return Math.round((SECTION_BUDGET * missing) / required);
}

export function qualityPoints(input: {
  placeholders: number;
  duplicateHeadings: number;
  longSentences: number;
  undefinedAcronyms: number;
  inconsistentDates: number;
  emptySections: number;
}): { points: number; items: { label: string; points: number }[] } {
  const items: { label: string; points: number }[] = [];
  const push = (count: number, each: number, max: number, label: string) => {
    if (count <= 0) return;
    items.push({ label, points: Math.min(max, count * each) });
  };
  push(input.placeholders, 3, 9, `Placeholder text (${input.placeholders})`);
  push(input.duplicateHeadings, 4, 8, `Duplicate headings (${input.duplicateHeadings})`);
  push(input.longSentences, 2, 8, `Very long sentences (${input.longSentences})`);
  push(input.undefinedAcronyms, 2, 8, `Undefined acronyms (${input.undefinedAcronyms})`);
  if (input.inconsistentDates > 0) {
    items.push({ label: "Inconsistent dates", points: 8 });
  }
  push(input.emptySections, 4, 12, `Empty sections (${input.emptySections})`);
  return { points: items.reduce((sum, item) => sum + item.points, 0), items };
}

export function buildScore(input: {
  requiredSections: number;
  missingSections: string[];
  metadataDeductions: Deduction[];
  qualityItems: { label: string; points: number }[];
}): ScoreBreakdown {
  const sectionPoints = sectionDeduction(input.requiredSections, input.missingSections.length);
  const deductions: Deduction[] = [];
  if (sectionPoints > 0) {
    deductions.push({
      category: "sections",
      label: `Missing required sections: ${input.missingSections.join(", ")}`,
      points: sectionPoints,
    });
  }

  const metadataRaw = input.metadataDeductions.reduce((sum, item) => sum + item.points, 0);
  const metadataCapped = metadataRaw > METADATA_BUDGET;
  deductions.push(...input.metadataDeductions);

  const qualityRaw = input.qualityItems.reduce((sum, item) => sum + item.points, 0);
  const qualityCapped = qualityRaw > QUALITY_BUDGET;
  for (const item of input.qualityItems) {
    deductions.push({ category: "quality", label: item.label, points: item.points });
  }

  const sections = SECTION_BUDGET - sectionPoints;
  const metadata = Math.max(0, METADATA_BUDGET - metadataRaw);
  const quality = Math.max(0, QUALITY_BUDGET - qualityRaw);

  return {
    sections,
    metadata,
    quality,
    total: sections + metadata + quality,
    sectionBudget: SECTION_BUDGET,
    metadataBudget: METADATA_BUDGET,
    qualityBudget: QUALITY_BUDGET,
    deductions,
    capped: { metadata: metadataCapped, quality: qualityCapped },
  };
}
