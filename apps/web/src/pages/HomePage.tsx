import { analyzeDocument } from "@policylens/core";
import { useMemo } from "react";
import { Pricing } from "../components/Pricing.tsx";
import { ScoreRing } from "../components/ScoreRing.tsx";
import { requestSample } from "../lib/handoff.ts";
import { localIso } from "../lib/format.ts";
import { SAMPLE_POLICY } from "../sample.ts";

const CHECKS = [
  ["Required sections", "Purpose, scope, policy, procedure, responsibilities, definitions, references, and approval history."],
  ["Owners and dates", "Owner, approver, effective date, last review, and next review. A review older than the window you set is flagged."],
  ["Draft marks", "TBD, XXX, lorem ipsum, [insert], duplicate headings, empty sections, long sentences, undefined acronyms, and dates that contradict each other."],
  ["A score you can audit", "0–100, with the points for sections, metadata, and draft quality written out."],
];

export function HomePage() {
  const preview = useMemo(
    () => analyzeDocument(SAMPLE_POLICY, { template: "healthcare", referenceDate: localIso() }),
    [],
  );
  const highlights = preview.findings.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div>
          <p className="kicker">Policy document QA</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Read the policy. Show what is missing.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Drop in a policy or procedure. PolicyLens checks the sections, owners, review dates, and draft marks a
            compliance review looks for. The file is read in this browser. It is not uploaded.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn-primary" href="#/review">
              Review a document
            </a>
            <button type="button" className="btn-secondary" onClick={requestSample}>
              Open the sample
            </button>
          </div>
          <p className="mt-4 max-w-xl text-sm text-ink-soft">
            PDF, DOCX, TXT, Markdown, or pasted text. For healthcare, finance, or any team that approves controlled
            documents. The sample is a made-up ward policy with gaps left in on purpose.
          </p>
        </div>
        <aside className="panel p-5" aria-label="Sample check">
          <p className="kicker">Sample, checked in this browser</p>
          <div className="mt-4 flex items-center gap-4">
            <ScoreRing score={preview.score.total} />
            <div>
              <h2 className="font-serif text-2xl">Hand hygiene on the ward</h2>
              <p className="text-sm text-ink-soft">Healthcare checklist · {preview.referenceDate}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {highlights.map((finding) => (
              <li key={finding.id} className="rounded-xl bg-paper px-3 py-2">
                <span className="font-semibold">{finding.title}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-secondary mt-4" onClick={requestSample}>
            Inspect this sample
          </button>
        </aside>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Bring the document", "The text is extracted here. You can edit it before the check, which matters when a PDF splits lines oddly."],
          ["2", "Pick a checklist", "Healthcare, IT security, or an SOP. Change the headings if yours differ. The edit stays in this browser."],
          ["3", "Take the report", "A score, every deduction, and a JSON or printable HTML file. Batch mode scores several files and exports CSV."],
        ].map(([step, title, body]) => (
          <article key={step} className="panel p-5">
            <p className="font-serif text-3xl text-teal">{step}</p>
            <h2 className="mt-2 font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-3xl">What the rules look for</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          {CHECKS.map(([title, body]) => (
            <div key={title} className="border-t border-line pt-3">
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-1 text-sm text-ink-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel mt-16 p-6 sm:p-8">
        <p className="kicker">Privacy</p>
        <h2 className="mt-2 font-serif text-3xl">The document does not leave this device</h2>
        <div className="mt-4 grid gap-4 text-sm text-ink-soft md:grid-cols-2">
          <p>
            PDF text is extracted with PDF.js. DOCX text is extracted with Mammoth. The rules engine then runs in the
            page. There is no PolicyLens account and no upload.
          </p>
          <p>
            The optional model review is off until you run it. That is the only step that sends text off the device,
            and it sends the text only to OpenAI or Anthropic with the API key you type. The key is kept for this
            browser tab.
          </p>
        </div>
      </section>

      <section className="mt-16" id="pricing">
        <h2 className="font-serif text-3xl">Pricing</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Free is enough to check a document and a short batch. Pro is listed so the boundary is clear. Checkout is not
          wired up yet.
        </p>
        <div className="mt-5">
          <Pricing />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-3xl">Limits of this version</h2>
        <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li>A scanned PDF with no text layer cannot be read. Paste the text instead.</li>
          <li>Headings are detected with rules. A line that does not look like a heading will not count as a section.</li>
          <li>Numeric dates are read as month/day/year.</li>
          <li>The license key is checked locally. It is not tied to a payment yet.</li>
          <li>The score is a drafting aid. It is not an audit opinion.</li>
        </ul>
      </section>
    </div>
  );
}
