import { analyzeDocument, type Template } from "@policylens/core";
import { useEffect, useMemo, useState } from "react";
import { AiPanel } from "../components/AiPanel.tsx";
import { AnalysisView } from "../components/AnalysisView.tsx";
import { consumePending, requestSample } from "../lib/handoff.ts";
import { extractFile } from "../lib/extract.ts";
import { localIso, plural } from "../lib/format.ts";
import { activeTemplates, isPro, selectedTemplate, updateState, useAppState } from "../lib/store.ts";

export function ReviewPage() {
  const app = useAppState();
  const template = selectedTemplate(app);
  const templates = activeTemplates(app);
  const pro = isPro(app);
  const [text, setText] = useState("");
  const [name, setName] = useState("Pasted policy");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const apply = () => {
      const pending = consumePending();
      if (!pending) return;
      setName(pending.name);
      setText(pending.text);
      setNote("");
      setError("");
    };
    apply();
    window.addEventListener("policylens-open", apply);
    return () => window.removeEventListener("policylens-open", apply);
  }, []);

  const analysis = useMemo(() => {
    if (!text.trim()) return null;
    return analyzeDocument(text, {
      template,
      referenceDate: localIso(),
      staleReviewMonths: app.staleReviewMonths,
    });
  }, [text, template, app.staleReviewMonths]);

  async function takeFiles(files: FileList | File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const extracted = await extractFile(file);
      setText(extracted.text);
      setName(file.name);
      setNote(extracted.note ?? `Extracted text from ${file.name}. Edit it below if a line broke in the wrong place.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <p className="kicker">Reviewer</p>
        <h1 className="mt-2 font-serif text-4xl">Check one document</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Text stays in this tab. Choose a checklist, then drop a file or paste. The score updates as you edit.
        </p>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="space-y-4 lg:sticky lg:top-20">
          <div className="panel space-y-3 p-4">
            <label className="block text-sm font-semibold" htmlFor="template">
              Checklist
              <select
                id="template"
                className="field mt-1"
                value={template.id}
                onChange={(event) => updateState({ templateId: event.target.value })}
              >
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {templateLabel(item, Boolean(app.overrides[item.id]))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold" htmlFor="stale-months">
              Flag a review older than
              <span className="mt-1 flex items-center gap-2">
                <input
                  id="stale-months"
                  className="field w-24"
                  type="number"
                  min={0}
                  max={120}
                  value={app.staleReviewMonths}
                  onChange={(event) => updateState({ staleReviewMonths: clampMonths(event.target.value) })}
                />
                <span className="text-sm font-normal text-ink-soft">months. Saved on this device.</span>
              </span>
            </label>
            <p className="text-xs text-ink-soft">
              <a className="underline decoration-line underline-offset-2" href="#/templates">
                Edit this checklist
              </a>
              . {template.description}
            </p>
          </div>

          <div
            className={`panel p-4 ${dragOver ? "border-teal bg-teal-soft" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void takeFiles(event.dataTransfer.files);
            }}
          >
            <label className="flex cursor-pointer flex-col items-start gap-2">
              <span className="text-sm font-semibold">{busy ? "Reading…" : "Drop a PDF, DOCX, TXT, or Markdown file"}</span>
              <span className="text-sm text-ink-soft">Or choose a file. Nothing is uploaded.</span>
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown,text/plain,application/pdf"
                onChange={(event) => {
                  if (event.target.files) void takeFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <span className="btn-secondary">Choose file</span>
            </label>
          </div>

          <label className="block text-sm font-semibold" htmlFor="policy-text">
            Text that will be checked
            <textarea
              id="policy-text"
              className="field mt-1 min-h-72 font-sans leading-relaxed"
              value={text}
              placeholder="Paste a policy, or drop a file."
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <p className="text-xs text-ink-soft">
            {plural(text.trim() ? text.trim().split(/\s+/).length : 0, "word")} · {name}
          </p>
          {note ? <p className="text-sm text-ink-soft">{note}</p> : null}
          {error ? (
            <p className="text-sm text-clay" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <div className="space-y-5">
          {analysis ? (
            <AnalysisView analysis={analysis} documentName={name || "Policy"} orgName={pro ? app.orgName : undefined} />
          ) : (
            <div className="panel p-6">
              <h2 className="font-serif text-2xl">No document yet</h2>
              <p className="mt-2 text-sm text-ink-soft">
                The check runs as soon as there is text. Load the sample if you want a made-up policy that already has
                a few gaps.
              </p>
              <button type="button" className="btn-primary mt-4" onClick={requestSample}>
                Load the sample
              </button>
            </div>
          )}
          <AiPanel text={text} />
        </div>
      </div>
    </div>
  );
}

function templateLabel(template: Template, edited: boolean): string {
  const suffix = !template.builtIn ? " (custom)" : edited ? " (edited)" : "";
  return `${template.name}${suffix}`;
}

function clampMonths(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(120, Math.max(0, Math.round(parsed)));
}
