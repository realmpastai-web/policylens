import type { Analysis, CheckId, Finding } from "@policylens/core";
import { downloadBlob, safeFilename } from "../lib/format.ts";
import { printHtml, reportHtml } from "../lib/report.ts";
import { ScoreRing } from "./ScoreRing.tsx";

const GROUPS: Array<{ title: string; ids: CheckId[] }> = [
  {
    title: "Sections",
    ids: ["missing_section", "empty_section", "duplicate_heading"],
  },
  {
    title: "Owners and dates",
    ids: [
      "missing_owner",
      "missing_approver",
      "missing_effective_date",
      "missing_last_reviewed",
      "missing_next_review",
      "stale_review",
      "inconsistent_dates",
    ],
  },
  {
    title: "Draft quality",
    ids: ["placeholder_text", "long_sentence", "undefined_acronym"],
  },
];

export function AnalysisView({
  analysis,
  documentName,
  orgName,
}: {
  analysis: Analysis;
  documentName: string;
  orgName?: string;
}) {
  const html = reportHtml(analysis, { documentName, orgName });
  const fileBase = safeFilename(documentName);

  function downloadJson() {
    const payload = { product: "PolicyLens", documentName, analysis };
    downloadBlob(
      `${fileBase}-policylens.json`,
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
  }

  function downloadHtml() {
    downloadBlob(`${fileBase}-policylens.html`, new Blob([html], { type: "text/html" }));
  }

  const meta = [
    ["Owner", analysis.metadata.owner?.value],
    ["Approver", analysis.metadata.approver?.value],
    ["Effective", analysis.metadata.effectiveDate?.date],
    ["Last reviewed", analysis.metadata.lastReviewed?.date],
    ["Next review", analysis.metadata.nextReview?.date],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={analysis.score.total} />
          <div className="min-w-0 flex-1">
            <p className="kicker">{analysis.templateName}</p>
            <h2 className="mt-1 font-serif text-2xl" aria-live="polite">
              QA score {analysis.score.total}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Checked {analysis.referenceDate} on this device. Stale after {analysis.staleReviewMonths} months.{" "}
              {analysis.stats.words} words, {analysis.stats.headings} headings.
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <ScorePart label="Sections" value={analysis.score.sections} budget={analysis.score.sectionBudget} />
              <ScorePart label="Metadata" value={analysis.score.metadata} budget={analysis.score.metadataBudget} />
              <ScorePart label="Quality" value={analysis.score.quality} budget={analysis.score.qualityBudget} />
            </dl>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={downloadJson}>
            Download JSON
          </button>
          <button type="button" className="btn-secondary" onClick={downloadHtml}>
            Download HTML
          </button>
          <button type="button" className="btn-secondary" onClick={() => printHtml(html)}>
            Print
          </button>
        </div>
      </div>

      <section className="panel p-5">
        <h3 className="font-serif text-xl">How the points were removed</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Sections start at 40 and lose 40 × missing required sections ÷ required sections, rounded. Owners and dates
          start at 30. Draft quality starts at 30. Each line is one deduction.
        </p>
        {analysis.score.deductions.length === 0 ? (
          <p className="mt-3 text-sm">Nothing was deducted.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {analysis.score.deductions.map((item) => (
              <li key={`${item.category}-${item.label}`} className="flex justify-between gap-4 py-2">
                <span>{item.label}</span>
                <span className="font-semibold tabular-nums">−{item.points}</span>
              </li>
            ))}
          </ul>
        )}
        {analysis.score.capped.metadata || analysis.score.capped.quality ? (
          <p className="mt-2 text-sm text-ink-soft">
            {analysis.score.capped.metadata ? "Metadata deductions were capped at 30. " : ""}
            {analysis.score.capped.quality ? "Quality deductions were capped at 30." : ""}
          </p>
        ) : null}
      </section>

      <section className="panel p-5">
        <h3 className="font-serif text-xl">Owners and dates</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {meta.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-paper px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="mt-1 text-sm">{value ?? "Not found"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel p-5">
        <h3 className="font-serif text-xl">Checklist</h3>
        <ul className="mt-3 divide-y divide-line">
          {analysis.sections.map((section) => {
            const status = !section.present ? "Missing" : section.empty ? "Empty" : "Present";
            const tone = !section.present ? "text-clay" : section.empty ? "text-amber" : "text-teal-deep";
            return (
              <li key={section.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{section.label}</span>
                  <span className="ml-2 text-ink-soft">{section.required ? "Required" : "Optional"}</span>
                  {section.matchedHeading ? (
                    <span className="mt-0.5 block text-ink-soft">
                      Matched “{section.matchedHeading}”{section.line ? ` on line ${section.line}` : ""}
                    </span>
                  ) : null}
                </span>
                <span className={`shrink-0 font-semibold ${tone}`}>{status}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-xl">Findings</h3>
        {analysis.findings.length === 0 ? (
          <p className="panel p-5 text-sm">No findings. The checklist, dates, and draft checks all passed.</p>
        ) : (
          GROUPS.map((group) => {
            const items = analysis.findings.filter((finding) => group.ids.includes(finding.checkId));
            if (items.length === 0) return null;
            return (
              <div key={group.title} className="panel p-5">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{group.title}</h4>
                <ul className="mt-2 divide-y divide-line">
                  {items.map((finding) => (
                    <FindingRow key={finding.id} finding={finding} />
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function ScorePart({ label, value, budget }: { label: string; value: number; budget: number }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value}
        <span className="font-normal text-ink-soft">/{budget}</span>
      </dd>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const tone =
    finding.severity === "high"
      ? "bg-clay/10 text-clay"
      : finding.severity === "medium"
        ? "bg-amber-soft text-amber"
        : "bg-teal-soft text-teal-deep";
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
          {finding.severity}
        </span>
        <p className="font-semibold">{finding.title}</p>
      </div>
      <p className="mt-1 text-ink-soft">{finding.detail}</p>
      {finding.excerpt ? (
        <p className="mt-2 rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink">{finding.excerpt}</p>
      ) : null}
      <p className="mt-2 text-ink-soft">
        <span className="font-semibold text-ink">How to fix. </span>
        {finding.howToFix}
      </p>
    </li>
  );
}
