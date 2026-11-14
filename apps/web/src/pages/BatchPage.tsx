import { analyzeDocument, type Analysis } from "@policylens/core";
import { useEffect, useState } from "react";
import { FREE_BATCH_LIMIT } from "../config.ts";
import { resultsToCsv, type CsvRow } from "../lib/csv.ts";
import { extractFile } from "../lib/extract.ts";
import { downloadBlob, localIso } from "../lib/format.ts";
import { openInReview } from "../lib/handoff.ts";
import { activeTemplates, isPro, selectedTemplate, updateState, useAppState } from "../lib/store.ts";

interface Row {
  key: string;
  name: string;
  status: "queued" | "reading" | "done" | "skipped" | "error";
  message?: string;
  text?: string;
  analysis?: Analysis;
}

export function BatchPage() {
  const app = useAppState();
  const template = selectedTemplate(app);
  const templates = activeTemplates(app);
  const pro = isPro(app);
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    const limit = pro ? files.length : FREE_BATCH_LIMIT;

    async function run() {
      const next: Row[] = files.map((file, index) => ({
        key: fileKey(file, index),
        name: file.name,
        status: index < limit ? "queued" : "skipped",
        message: index < limit ? undefined : `Not checked. The free batch limit is ${FREE_BATCH_LIMIT} files.`,
      }));
      if (!cancelled) setRows(next);

      for (let index = 0; index < files.length && index < limit; index += 1) {
        const file = files[index];
        if (!file || cancelled) return;
        updateRow(index, { status: "reading" });
        try {
          const extracted = await extractFile(file);
          if (cancelled) return;
          if (!extracted.text.trim()) {
            updateRow(index, { status: "error", message: extracted.note ?? "This file had no text." });
            continue;
          }
          const analysis = analyzeDocument(extracted.text, {
            template,
            referenceDate: localIso(),
            staleReviewMonths: app.staleReviewMonths,
          });
          updateRow(index, { status: "done", analysis, text: extracted.text, message: extracted.note });
        } catch (caught) {
          if (cancelled) return;
          updateRow(index, {
            status: "error",
            message: caught instanceof Error ? caught.message : "Could not read this file.",
          });
        }
      }
    }

    function updateRow(index: number, patch: Partial<Row>) {
      if (cancelled) return;
      setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [files, template, app.staleReviewMonths, pro]);

  function addFiles(list: FileList | File[]) {
    const incoming = [...list];
    setFiles((current) => {
      const seen = new Set(current.map((file) => fileKey(file)));
      const extra = incoming.filter((file) => !seen.has(fileKey(file)));
      return [...current, ...extra];
    });
  }

  const csvRows: CsvRow[] = rows
    .filter((row) => row.status === "done" || row.status === "error")
    .map((row) => ({ file: row.name, analysis: row.analysis, error: row.status === "error" ? row.message : undefined }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kicker">Batch</p>
          <h1 className="mt-2 font-serif text-4xl">Score several files</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {pro
              ? "Pro is on for this browser, so every file in the batch is checked."
              : `Free checks the first ${FREE_BATCH_LIMIT} files. Later files stay listed and are not read.`}{" "}
            Files are still processed only in this browser.
          </p>
        </div>
        <label className="btn-primary cursor-pointer">
          Add files
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown,text/plain,application/pdf"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor="batch-template">
          Checklist
          <select
            id="batch-template"
            className="ml-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal"
            value={template.id}
            onChange={(event) => updateState({ templateId: event.target.value })}
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-quiet" onClick={() => setFiles([])} disabled={files.length === 0}>
          Clear batch
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={csvRows.length === 0}
          onClick={() => downloadBlob("policylens-batch.csv", new Blob([resultsToCsv(csvRows)], { type: "text/csv" }))}
        >
          Download CSV
        </button>
      </div>

      <div
        className="panel mt-4 overflow-x-auto"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">Drop files here, or use Add files. PDF, DOCX, TXT, and Markdown.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Batch scores</caption>
            <thead className="text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-3 py-3 font-semibold">Score</th>
                <th className="px-3 py-3 font-semibold">Missing sections</th>
                <th className="px-3 py-3 font-semibold">High</th>
                <th className="px-3 py-3 font-semibold">Owner</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3 tabular-nums">{row.analysis ? row.analysis.score.total : "—"}</td>
                  <td className="px-3 py-3">
                    {row.analysis
                      ? row.analysis.sections
                          .filter((section) => section.required && !section.present)
                          .map((section) => section.label)
                          .join(", ") || "None"
                      : "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {row.analysis ? row.analysis.findings.filter((finding) => finding.severity === "high").length : "—"}
                  </td>
                  <td className="px-3 py-3">{row.analysis?.metadata.owner?.value ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Status row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Status({ row }: { row: Row }) {
  if (row.status === "done" && row.text) {
    return (
      <button type="button" className="underline decoration-line underline-offset-2" onClick={() => openInReview(row.name, row.text ?? "")}>
        Open
      </button>
    );
  }
  if (row.status === "reading" || row.status === "queued") return <span>Reading…</span>;
  return <span className={row.status === "error" ? "text-clay" : "text-ink-soft"}>{row.message}</span>;
}

function fileKey(file: File, index = 0): string {
  return `${file.name}:${file.size}:${file.lastModified}:${index}`;
}
