import { formatIso, isOlderThanMonths, parseDate, startOfUtcDay } from "./dates.ts";
import { howToFix } from "./explain.ts";
import { blocksFromHeadings, findHeadings, normalizeHeading, wordCount } from "./headings.ts";
import { extractFieldHits, isPlaceholderValue, metadataFromHits } from "./metadata.ts";
import type { FieldHit } from "./metadata.ts";
import {
  findLongSentences,
  findPlaceholders,
  findUndefinedAcronyms,
  proseWithoutHeadings,
} from "./quality.ts";
import { buildScore, METADATA_POINTS, qualityPoints } from "./score.ts";
import { assertTemplate, getTemplate } from "./templates.ts";
import type {
  Analysis,
  AnalyzeOptions,
  CheckId,
  Deduction,
  Finding,
  SectionResult,
  Severity,
  Template,
} from "./types.ts";

const SEVERITY: Record<CheckId, Severity> = {
  missing_section: "high",
  missing_owner: "high",
  missing_approver: "medium",
  missing_effective_date: "high",
  missing_last_reviewed: "medium",
  missing_next_review: "medium",
  stale_review: "high",
  placeholder_text: "medium",
  duplicate_heading: "low",
  long_sentence: "low",
  undefined_acronym: "low",
  inconsistent_dates: "high",
  empty_section: "high",
};

let findingCounter = 0;

function finding(
  checkId: CheckId,
  title: string,
  detail: string,
  extra?: { excerpt?: string; line?: number },
): Finding {
  findingCounter += 1;
  return {
    id: `${checkId}:${extra?.line ?? 0}:${findingCounter}`,
    checkId,
    severity: SEVERITY[checkId],
    title,
    detail,
    excerpt: extra?.excerpt,
    line: extra?.line,
    howToFix: howToFix(checkId),
  };
}

function patternMatches(heading: string, pattern: string): boolean {
  const normalizedHeading = normalizeHeading(heading);
  const normalizedPattern = normalizeHeading(pattern);
  if (!normalizedHeading || !normalizedPattern) return false;
  if (normalizedHeading === normalizedPattern) return true;
  if (normalizedPattern.split(" ").length >= 2 && normalizedHeading.includes(normalizedPattern)) {
    return true;
  }
  return (
    normalizedHeading === `${normalizedPattern} statement` ||
    normalizedHeading === `${normalizedPattern} section` ||
    normalizedHeading === `${normalizedPattern} overview`
  );
}

function resolveTemplate(template: AnalyzeOptions["template"]): Template {
  if (!template) return getTemplate("healthcare");
  if (typeof template === "string") return getTemplate(template);
  assertTemplate(template);
  return template;
}

function sectionResults(template: Template, text: string): { sections: SectionResult[]; headingLines: Set<number> } {
  const patterns = template.sections.flatMap((section) => section.patterns);
  const headings = findHeadings(text, patterns);
  const blocks = blocksFromHeadings(text, headings);
  const headingLines = new Set(headings.map((item) => item.line));

  const sections: SectionResult[] = template.sections.map((spec) => {
    const matches = blocks.filter((block) =>
      spec.patterns.some((pattern) => patternMatches(block.heading, pattern)),
    );
    const filled = matches.find((block) => wordCount(block.body) >= 5);
    const first = matches[0];
    return {
      id: spec.id,
      label: spec.label,
      required: spec.required,
      present: matches.length > 0,
      empty: matches.length > 0 && !filled,
      matchedHeading: first?.heading,
      line: first?.line,
    };
  });

  return { sections, headingLines };
}

function duplicateFindings(text: string, patterns: string[]): Finding[] {
  const headings = findHeadings(text, patterns);
  const groups = new Map<string, { text: string; lines: number[] }>();
  for (const heading of headings) {
    const key = normalizeHeading(heading.text);
    if (!key) continue;
    const group = groups.get(key) ?? { text: heading.text, lines: [] };
    group.lines.push(heading.line);
    groups.set(key, group);
  }
  const findings: Finding[] = [];
  for (const group of groups.values()) {
    if (group.lines.length < 2) continue;
    findings.push(
      finding(
        "duplicate_heading",
        `Duplicate heading: ${group.text}`,
        `The heading “${group.text}” appears on lines ${group.lines.join(", ")}.`,
        { line: group.lines[1], excerpt: group.text },
      ),
    );
  }
  return findings;
}

function dateFindings(hits: FieldHit[], reference: Date): Finding[] {
  const findings: Finding[] = [];
  const dated = hits.filter((hit) => hit.date && !isPlaceholderValue(hit.value));
  const byKey = new Map<string, FieldHit[]>();
  for (const hit of dated) {
    const list = byKey.get(hit.key) ?? [];
    list.push(hit);
    byKey.set(hit.key, list);
  }

  for (const [key, list] of byKey) {
    const unique = [...new Set(list.map((hit) => hit.date))];
    if (unique.length < 2) continue;
    const label = key === "effectiveDate" ? "Effective date" : key === "lastReviewed" ? "Last reviewed" : key === "nextReview" ? "Next review" : key;
    findings.push(
      finding(
        "inconsistent_dates",
        `${label} has more than one value`,
        list.map((hit) => `${hit.date} on line ${hit.line}`).join("; ") + ".",
        { line: list[1]?.line, excerpt: unique.join(" vs ") },
      ),
    );
  }

  const first = (key: FieldHit["key"]) => dated.find((hit) => hit.key === key);
  const effective = first("effectiveDate");
  const last = first("lastReviewed");
  const next = first("nextReview");

  if (effective?.date && next?.date && effective.date > next.date) {
    findings.push(
      finding(
        "inconsistent_dates",
        "Effective date is after the next review",
        `Effective date ${effective.date} is later than next review ${next.date}.`,
        { line: effective.line, excerpt: `${effective.date} → ${next.date}` },
      ),
    );
  }
  if (last?.date && next?.date && last.date > next.date) {
    findings.push(
      finding(
        "inconsistent_dates",
        "Last review is after the next review",
        `Last reviewed ${last.date} is later than next review ${next.date}.`,
        { line: last.line, excerpt: `${last.date} → ${next.date}` },
      ),
    );
  }
  const referenceIso = formatIso(reference);
  if (last?.date && last.date > referenceIso) {
    findings.push(
      finding(
        "inconsistent_dates",
        "Last review is in the future",
        `Last reviewed ${last.date} is after the check date ${referenceIso}.`,
        { line: last.line, excerpt: last.date },
      ),
    );
  }
  return findings;
}

function metadataFindings(hits: FieldHit[], reference: Date, staleMonths: number): { findings: Finding[]; deductions: Deduction[] } {
  const findings: Finding[] = [];
  const deductions: Deduction[] = [];
  const metadata = metadataFromHits(hits);

  const requireText = (
    key: "owner" | "approver",
    checkId: CheckId,
    title: string,
    emptyDetail: string,
  ) => {
    if (metadata[key]) return;
    const placeholder = hits.find((hit) => hit.key === key && isPlaceholderValue(hit.value));
    findings.push(
      finding(
        checkId,
        title,
        placeholder
          ? `${emptyDetail} Line ${placeholder.line} says “${placeholder.value}”, which is not a name.`
          : emptyDetail,
        placeholder ? { line: placeholder.line, excerpt: placeholder.value } : undefined,
      ),
    );
    deductions.push({
      category: "metadata",
      label: title,
      points: METADATA_POINTS[checkId] ?? 0,
    });
  };

  requireText("owner", "missing_owner", "Missing owner", "No owner line was found.");
  requireText("approver", "missing_approver", "Missing approver", "No approver line was found.");

  const requireDate = (key: "effectiveDate" | "lastReviewed" | "nextReview", checkId: CheckId, title: string) => {
    const field = metadata[key];
    if (field?.date) return false;
    const labeled = hits.find((hit) => hit.key === key);
    const detail = labeled
      ? field && !field.date
        ? `Line ${field.line} is labeled as a date but “${field.value}” could not be read. Numeric dates are month/day/year.`
        : `Line ${labeled.line} says “${labeled.value}”, which is not a usable date.`
      : `No ${title.toLowerCase()} was found.`;
    findings.push(finding(checkId, title, detail, labeled ? { line: labeled.line, excerpt: labeled.value } : undefined));
    deductions.push({ category: "metadata", label: title, points: METADATA_POINTS[checkId] ?? 0 });
    return true;
  };

  requireDate("effectiveDate", "missing_effective_date", "Missing effective date");
  const missingLast = requireDate("lastReviewed", "missing_last_reviewed", "Missing last reviewed date");
  requireDate("nextReview", "missing_next_review", "Missing next review date");

  const referenceIso = formatIso(reference);
  let staleBecauseOld = false;
  if (!missingLast && metadata.lastReviewed?.date) {
    const reviewed = parseDate(metadata.lastReviewed.date);
    if (reviewed && isOlderThanMonths(reviewed, reference, staleMonths)) {
      staleBecauseOld = true;
      findings.push(
        finding(
          "stale_review",
          "Review is stale",
          `Last reviewed ${metadata.lastReviewed.date} is more than ${staleMonths} months before the check date ${referenceIso}.`,
          { line: metadata.lastReviewed.line, excerpt: metadata.lastReviewed.date },
        ),
      );
    }
  }

  const overdueNext =
    Boolean(metadata.nextReview?.date) && (metadata.nextReview?.date ?? "") < referenceIso;
  if (overdueNext && metadata.nextReview?.date) {
    findings.push(
      finding(
        "stale_review",
        "Next review date has passed",
        `Next review ${metadata.nextReview.date} is before the check date ${referenceIso}.`,
        { line: metadata.nextReview.line, excerpt: metadata.nextReview.date },
      ),
    );
  }

  if (staleBecauseOld || overdueNext) {
    const label =
      staleBecauseOld && overdueNext
        ? `Stale review (older than ${staleMonths} months) and next review has passed`
        : staleBecauseOld
          ? `Stale review (older than ${staleMonths} months)`
          : "Next review date has passed";
    deductions.push({
      category: "metadata",
      label,
      points: METADATA_POINTS.stale_review ?? 0,
    });
  }

  return { findings, deductions };
}

export function analyzeDocument(text: string, options: AnalyzeOptions = {}): Analysis {
  const source = text ?? "";
  const template = resolveTemplate(options.template);
  const reference = startOfUtcDay(options.referenceDate);
  const staleReviewMonths = options.staleReviewMonths ?? template.staleReviewMonths ?? 12;
  if (!Number.isFinite(staleReviewMonths) || staleReviewMonths < 0) {
    throw new Error("staleReviewMonths must be a non-negative number.");
  }
  findingCounter = 0;
  const longSentenceWords = options.longSentenceWords ?? 40;

  const { sections, headingLines } = sectionResults(template, source);
  const patterns = template.sections.flatMap((section) => section.patterns);
  const hits = extractFieldHits(source);
  const meta = metadataFindings(hits, reference, staleReviewMonths);
  const findings: Finding[] = [...meta.findings];

  for (const section of sections) {
    if (section.required && !section.present) {
      const spec = template.sections.find((item) => item.id === section.id);
      findings.push(
        finding(
          "missing_section",
          `Missing section: ${section.label}`,
          `The ${template.name} checklist expects a heading such as ${spec?.patterns.slice(0, 3).join(", ")}.`,
        ),
      );
    }
    if (section.present && section.empty) {
      findings.push(
        finding(
          "empty_section",
          `Empty section: ${section.label}`,
          `“${section.matchedHeading}” on line ${section.line} has fewer than five words under it.`,
          { line: section.line, excerpt: section.matchedHeading },
        ),
      );
    }
  }

  findings.push(...duplicateFindings(source, patterns));
  findings.push(...dateFindings(hits, reference));

  for (const placeholder of findPlaceholders(source)) {
    findings.push(
      finding(
        "placeholder_text",
        "Placeholder text",
        `Line ${placeholder.line} contains “${placeholder.excerpt}”.`,
        { line: placeholder.line, excerpt: placeholder.excerpt },
      ),
    );
  }

  const prose = proseWithoutHeadings(source, headingLines);
  const longSentences = findLongSentences(prose, longSentenceWords);
  for (const sentence of longSentences.slice(0, 12)) {
    const words = wordCount(sentence);
    findings.push(
      finding(
        "long_sentence",
        `Long sentence (${words} words)`,
        "This sentence is over the word limit and is hard to follow as an instruction.",
        { excerpt: sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence },
      ),
    );
  }

  const acronyms = findUndefinedAcronyms(source, headingLines);
  for (const acronym of acronyms) {
    findings.push(
      finding(
        "undefined_acronym",
        `Undefined acronym: ${acronym.acronym}`,
        `${acronym.acronym} is used ${acronym.count === 1 ? "once" : `${acronym.count} times`} and is not expanded in the document.`,
        { line: acronym.line, excerpt: acronym.acronym },
      ),
    );
  }

  const missingNames = sections.filter((section) => section.required && !section.present).map((section) => section.label);
  const quality = qualityPoints({
    placeholders: findings.filter((item) => item.checkId === "placeholder_text").length,
    duplicateHeadings: findings.filter((item) => item.checkId === "duplicate_heading").length,
    longSentences: longSentences.length,
    undefinedAcronyms: acronyms.length,
    inconsistentDates: findings.filter((item) => item.checkId === "inconsistent_dates").length > 0 ? 1 : 0,
    emptySections: findings.filter((item) => item.checkId === "empty_section").length,
  });

  const score = buildScore({
    requiredSections: sections.filter((section) => section.required).length,
    missingSections: missingNames,
    metadataDeductions: meta.deductions,
    qualityItems: quality.items,
  });

  const severityOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || (a.line ?? 0) - (b.line ?? 0));

  return {
    templateId: template.id,
    templateName: template.name,
    referenceDate: formatIso(reference),
    staleReviewMonths,
    sections,
    metadata: metadataFromHits(hits),
    findings,
    score,
    stats: {
      words: wordCount(source),
      characters: source.length,
      headings: headingLines.size,
      sentences: findLongSentences(prose, 0).length,
      longSentences: longSentences.length,
    },
  };
}
