import { builtInTemplates, cloneTemplate, type SectionSpec, type Template } from "@policylens/core";
import { useState } from "react";
import { deleteCustom, isPro, resetBuiltIn, saveTemplate, selectedTemplate, updateState, useAppState } from "../lib/store.ts";

export function TemplatesPage() {
  const app = useAppState();
  const pro = isPro(app);
  const current = selectedTemplate(app);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");

  function commit(template: Template) {
    try {
      saveTemplate(template);
      setNotice("Saved in this browser.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save that checklist.");
    }
  }

  function updateSection(sectionId: string, patch: Partial<SectionSpec>) {
    commit({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    });
  }

  function addSection() {
    const id = uniqueId(current.sections.map((section) => section.id), "section");
    commit({
      ...current,
      sections: [
        ...current.sections,
        { id, label: "New section", required: true, patterns: ["new section"] },
      ],
    });
  }

  function removeSection(sectionId: string) {
    if (current.sections.length <= 1) {
      setNotice("A checklist needs at least one section.");
      return;
    }
    commit({ ...current, sections: current.sections.filter((section) => section.id !== sectionId) });
  }

  function createCustom() {
    const label = name.trim();
    if (!label) {
      setNotice("Name the checklist first.");
      return;
    }
    const id = uniqueId(
      [...builtInTemplates.map((template) => template.id), ...app.custom.map((template) => template.id)],
      "custom",
    );
    const copy = cloneTemplate(current);
    saveTemplate({ ...copy, id, name: label, description: "Custom checklist saved on this device.", builtIn: false });
    setName("");
    setNotice("Custom checklist saved on this device.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="kicker">Checklists</p>
      <h1 className="mt-2 font-serif text-4xl">Edit what “complete” means</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The three published checklists can be edited here, and the edit stays in this browser. Named extra checklists
        are part of Pro. Restoring a published checklist drops only the local edit.
      </p>

      <label className="mt-6 block text-sm font-semibold" htmlFor="edit-template">
        Checklist
        <select
          id="edit-template"
          className="field mt-1"
          value={current.id}
          onChange={(event) => {
            updateState({ templateId: event.target.value });
            setNotice("");
          }}
        >
          {builtInTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
              {app.overrides[template.id] ? " (edited on this device)" : ""}
            </option>
          ))}
          {pro
            ? app.custom.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} (custom)
                </option>
              ))
            : null}
        </select>
      </label>

      <label className="mt-4 block text-sm font-semibold" htmlFor="checklist-stale">
        Stale after
        <span className="mt-1 flex items-center gap-2 font-normal">
          <input
            id="checklist-stale"
            className="field w-24"
            type="number"
            min={0}
            max={120}
            value={app.staleReviewMonths}
            onChange={(event) => updateState({ staleReviewMonths: clampMonths(event.target.value) })}
          />
          <span className="text-sm text-ink-soft">months. This applies to every checklist.</span>
        </span>
      </label>

      <ul className="mt-6 space-y-3">
        {current.sections.map((section) => (
          <li key={`${current.id}:${section.id}:${section.patterns.join("|")}`} className="panel space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={section.required}
                  onChange={(event) => updateSection(section.id, { required: event.target.checked })}
                />
                Required
              </label>
              <button type="button" className="btn-quiet ml-auto" onClick={() => removeSection(section.id)}>
                Remove
              </button>
            </div>
            <label className="block text-sm font-semibold">
              Label
              <input
                className="field mt-1"
                value={section.label}
                onChange={(event) => updateSection(section.id, { label: event.target.value })}
              />
            </label>
            <PatternField
              patterns={section.patterns}
              onCommit={(patterns) => updateSection(section.id, { patterns })}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={addSection}>
          Add section
        </button>
        {current.builtIn ? (
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              resetBuiltIn(current.id);
              setNotice("Restored the published checklist.");
            }}
            disabled={!app.overrides[current.id]}
          >
            Restore published checklist
          </button>
        ) : (
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              deleteCustom(current.id);
              setNotice("Custom checklist removed from this browser.");
            }}
          >
            Delete custom checklist
          </button>
        )}
      </div>

      <div className="panel mt-8 p-4">
        <h2 className="font-serif text-2xl">Save a named checklist</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {pro
            ? "This copies the checklist above into a new name, stored on this device."
            : "Named checklists are part of Pro. You can still edit the three published ones above."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="field"
            value={name}
            disabled={!pro}
            placeholder="Ward procedure"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="button" className="btn-primary" disabled={!pro} onClick={createCustom}>
            {pro ? "Save copy" : "Pro"}
          </button>
        </div>
      </div>
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
    </div>
  );
}

function PatternField({ patterns, onCommit }: { patterns: string[]; onCommit: (patterns: string[]) => void }) {
  const [value, setValue] = useState(patterns.join(", "));
  const [error, setError] = useState("");
  const signature = patterns.join("|");

  return (
    <label className="block text-sm font-semibold">
      Headings that count
      <input
        className="field mt-1"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          if (next.length === 0) {
            setValue(patterns.join(", "));
            setError("Keep at least one heading phrase.");
            return;
          }
          setError("");
          if (next.join("|") !== signature) onCommit(next);
        }}
      />
      <span className="mt-1 block text-xs font-normal text-ink-soft">
        Comma-separated. A heading matches the phrase exactly, not as a loose search. {error}
      </span>
    </label>
  );
}

function uniqueId(existing: string[], prefix: string): string {
  const taken = new Set(existing);
  let id = prefix;
  let n = 2;
  while (taken.has(id)) {
    id = `${prefix}-${n}`;
    n += 1;
  }
  return id;
}

function clampMonths(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(120, Math.max(0, Math.round(parsed)));
}
