import type { Analysis, Finding, Severity } from "@policylens/core";

export interface ReportMeta {
  documentName: string;
  orgName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function severityLabel(severity: Severity): string {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

function findingHtml(finding: Finding): string {
  return `<article class="finding">
    <p class="sev sev-${finding.severity}">${severityLabel(finding.severity)}</p>
    <h3>${escapeHtml(finding.title)}</h3>
    <p>${escapeHtml(finding.detail)}</p>
    ${finding.excerpt ? `<p class="excerpt">${escapeHtml(finding.excerpt)}</p>` : ""}
    <p class="fix"><strong>How to fix.</strong> ${escapeHtml(finding.howToFix)}</p>
  </article>`;
}

export function reportHtml(analysis: Analysis, meta: ReportMeta): string {
  const org = meta.orgName?.trim();
  const deductions = analysis.score.deductions
    .map((item) => `<li><span>${escapeHtml(item.label)}</span><span>−${item.points}</span></li>`)
    .join("");
  const sections = analysis.sections
    .map((section) => {
      const status = !section.present ? "Missing" : section.empty ? "Empty" : "Present";
      return `<tr><td>${escapeHtml(section.label)}</td><td>${section.required ? "Required" : "Optional"}</td><td>${status}</td><td>${section.line ? `Line ${section.line}` : ""}</td></tr>`;
    })
    .join("");
  const fields: Array<[string, string]> = [
    ["Owner", analysis.metadata.owner?.value ?? "Not found"],
    ["Approver", analysis.metadata.approver?.value ?? "Not found"],
    ["Effective date", analysis.metadata.effectiveDate?.date ?? analysis.metadata.effectiveDate?.value ?? "Not found"],
    ["Last reviewed", analysis.metadata.lastReviewed?.date ?? analysis.metadata.lastReviewed?.value ?? "Not found"],
    ["Next review", analysis.metadata.nextReview?.date ?? analysis.metadata.nextReview?.value ?? "Not found"],
  ];
  const metaRows = fields
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PolicyLens report — ${escapeHtml(meta.documentName)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: Georgia, "Iowan Old Style", serif; color: #1a2332; background: #f6f3ec; }
    main { max-width: 760px; margin: 0 auto; padding: 40px 28px 64px; background: white; }
    header { border-bottom: 3px solid #0e6b66; padding-bottom: 16px; margin-bottom: 24px; }
    .kicker { font-family: "Segoe UI", sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #0e6b66; margin: 0 0 8px; }
    h1 { font-size: 32px; line-height: 1.1; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 28px 0 8px; }
    h3 { font-size: 16px; margin: 0 0 6px; }
    p, li, td, th { font-family: "Segoe UI", sans-serif; font-size: 14px; line-height: 1.45; }
    .muted { color: #465066; }
    .score { display: flex; gap: 24px; align-items: baseline; }
    .score strong { font-family: Georgia, serif; font-size: 56px; line-height: 1; }
    .subs { display: flex; gap: 16px; padding: 0; margin: 8px 0 0; list-style: none; }
    .subs li { background: #f3efe6; padding: 8px 10px; }
    ul.deductions { list-style: none; padding: 0; }
    ul.deductions li { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e7e0d2; padding: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; border-bottom: 1px solid #e7e0d2; padding: 6px 8px 6px 0; vertical-align: top; }
    .finding { border-top: 1px solid #e7e0d2; padding: 12px 0; }
    .sev { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 4px; }
    .sev-high { color: #8f3d2b; }
    .sev-medium { color: #8a5a12; }
    .sev-low { color: #0e6b66; }
    .excerpt { font-family: ui-monospace, monospace; font-size: 12px; background: #f6f3ec; padding: 8px; }
    .fix { color: #465066; }
    footer { margin-top: 32px; border-top: 1px solid #e7e0d2; padding-top: 12px; }
    @media print { body { background: white; } main { padding: 0; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="kicker">PolicyLens QA report${org ? ` · ${escapeHtml(org)}` : ""}</p>
      <h1>${escapeHtml(meta.documentName)}</h1>
      <p class="muted">${escapeHtml(analysis.templateName)} checklist · checked ${escapeHtml(analysis.referenceDate)} · stale after ${analysis.staleReviewMonths} months · ${analysis.stats.words} words</p>
    </header>
    <section class="score">
      <strong>${analysis.score.total}</strong>
      <div>
        <p>QA score out of 100. Sections ${analysis.score.sections}/${analysis.score.sectionBudget}, owners and dates ${analysis.score.metadata}/${analysis.score.metadataBudget}, draft quality ${analysis.score.quality}/${analysis.score.qualityBudget}.</p>
        <ul class="subs">
          <li>Sections ${analysis.score.sections}</li>
          <li>Metadata ${analysis.score.metadata}</li>
          <li>Quality ${analysis.score.quality}</li>
        </ul>
      </div>
    </section>
    <h2>Point deductions</h2>
    ${
      deductions
        ? `<ul class="deductions">${deductions}</ul>`
        : `<p>No points were deducted.</p>`
    }
    ${analysis.score.capped.metadata || analysis.score.capped.quality ? `<p class="muted">A category that ran past its budget was capped, so the lines above can add up to more than the points removed.</p>` : ""}
    <h2>Owners and dates</h2>
    <table>${metaRows}</table>
    <h2>Sections</h2>
    <table><thead><tr><th>Section</th><th>Checklist</th><th>Status</th><th>Where</th></tr></thead><tbody>${sections}</tbody></table>
    <h2>Findings</h2>
    ${analysis.findings.length ? analysis.findings.map(findingHtml).join("") : "<p>No findings.</p>"}
    <footer>
      <p class="muted">Produced in the browser by PolicyLens. This document was not uploaded. The score is the rules engine, not a legal opinion. Model review, if you ran one, is not included here.</p>
    </footer>
  </main>
</body>
</html>`;
}

export function printHtml(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.title = "Printable PolicyLens report";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const frame = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!frame || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.focus();
    frame.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 200);
}
