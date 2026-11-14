import type { Analysis } from "@policylens/core";

export interface CsvRow {
  file: string;
  analysis?: Analysis;
  error?: string;
}

function cell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function resultsToCsv(rows: CsvRow[]): string {
  const header = [
    "file",
    "score",
    "sections",
    "metadata",
    "quality",
    "missing_sections",
    "findings",
    "high_findings",
    "owner",
    "effective_date",
    "last_reviewed",
    "next_review",
    "stale",
    "error",
  ];
  const lines = rows.map((row) => {
    const analysis = row.analysis;
    const missing = analysis
      ? analysis.sections
          .filter((section) => section.required && !section.present)
          .map((section) => section.label)
          .join("; ")
      : "";
    const stale = analysis ? (analysis.findings.some((finding) => finding.checkId === "stale_review") ? "yes" : "no") : "";
    return [
      row.file,
      analysis?.score.total ?? "",
      analysis?.score.sections ?? "",
      analysis?.score.metadata ?? "",
      analysis?.score.quality ?? "",
      missing,
      analysis?.findings.length ?? "",
      analysis?.findings.filter((finding) => finding.severity === "high").length ?? "",
      analysis?.metadata.owner?.value ?? "",
      analysis?.metadata.effectiveDate?.date ?? "",
      analysis?.metadata.lastReviewed?.date ?? "",
      analysis?.metadata.nextReview?.date ?? "",
      stale,
      row.error ?? "",
    ]
      .map(cell)
      .join(",");
  });
  return `\uFEFF${[header.join(","), ...lines].join("\n")}\n`;
}
