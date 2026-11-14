import { formatIso, parseDate } from "./dates.ts";
import { normalizeHeading } from "./headings.ts";
import type { DocumentMetadata, MetadataField } from "./types.ts";

export type DateFieldKey = "effectiveDate" | "lastReviewed" | "nextReview";
export type FieldKey = "owner" | "approver" | DateFieldKey;

interface FieldDef {
  key: FieldKey;
  labels: string[];
}

const FIELDS: FieldDef[] = [
  { key: "owner", labels: ["owner", "policy owner", "document owner"] },
  { key: "approver", labels: ["approver", "approved by", "approval authority"] },
  { key: "effectiveDate", labels: ["effective date", "effective", "effective from"] },
  {
    key: "lastReviewed",
    labels: ["last reviewed", "last review date", "last review", "reviewed on", "review date"],
  },
  {
    key: "nextReview",
    labels: ["next review date", "next review", "next review due", "review due"],
  },
];

const LABEL_INDEX = new Map<string, FieldKey>();
for (const field of [...FIELDS].sort(
  (a, b) => Math.max(...b.labels.map((label) => label.length)) - Math.max(...a.labels.map((label) => label.length)),
)) {
  for (const label of field.labels) LABEL_INDEX.set(label, field.key);
}

export interface FieldHit {
  key: FieldKey;
  value: string;
  date?: string;
  line: number;
}

function cleanInline(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPlaceholderValue(value: string): boolean {
  const cleaned = cleanInline(value).replace(/^[-–—]+|[-–—]+$/g, "").trim();
  if (!cleaned) return true;
  if (/^(tbd|tba|xxx+|n\/a|na|none|unknown|tbc)$/i.test(cleaned)) return true;
  if (/^\[(insert|placeholder)[^\]]*\]$/i.test(cleaned)) return true;
  return false;
}

function matchLabel(label: string): FieldKey | undefined {
  return LABEL_INDEX.get(normalizeHeading(label));
}

export function extractFieldHits(text: string): FieldHit[] {
  const hits: FieldHit[] = [];
  const lines = text.split(/\n/);

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;

    const table = /^\|?\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/.exec(line);
    const labeled = /^([^:]{2,60}):\s*(.+)$/.exec(line.replace(/^[*_`\s]+/, ""));

    const pair = table
      ? { label: table[1] ?? "", value: table[2] ?? "" }
      : labeled
        ? { label: labeled[1] ?? "", value: labeled[2] ?? "" }
        : null;
    if (!pair) return;

    const key = matchLabel(cleanInline(pair.label));
    if (!key) return;
    const value = cleanInline(pair.value);
    if (!value) return;
    const parsed = parseDate(value);
    hits.push({
      key,
      value,
      date: parsed ? formatIso(parsed) : undefined,
      line: index + 1,
    });
  });

  return hits;
}

export function firstUsableField(hits: FieldHit[], key: FieldKey): MetadataField | undefined {
  const hit = hits.find((item) => item.key === key && !isPlaceholderValue(item.value));
  if (!hit) return undefined;
  if (key === "owner" || key === "approver") {
    return { value: hit.value, line: hit.line };
  }
  return { value: hit.value, date: hit.date, line: hit.line };
}

export function metadataFromHits(hits: FieldHit[]): DocumentMetadata {
  return {
    owner: firstUsableField(hits, "owner"),
    approver: firstUsableField(hits, "approver"),
    effectiveDate: firstUsableField(hits, "effectiveDate"),
    lastReviewed: firstUsableField(hits, "lastReviewed"),
    nextReview: firstUsableField(hits, "nextReview"),
  };
}
