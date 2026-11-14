import { wordCount } from "./headings.ts";

const PLACEHOLDER_PATTERNS = [
  /\bTBD\b/gi,
  /\bTBA\b/gi,
  /\bXXX+\b/gi,
  /\bTODO\b/gi,
  /\bFIXME\b/gi,
  /lorem ipsum/gi,
  /\[insert[^\]]*\]/gi,
  /\[placeholder[^\]]*\]/gi,
  /_{3,}/g,
];

export interface TextHit {
  line: number;
  excerpt: string;
}

export function findPlaceholders(text: string): TextHit[] {
  const hits: TextHit[] = [];
  const lines = text.split(/\n/);
  lines.forEach((line, index) => {
    const seen = new Set<number>();
    for (const pattern of PLACEHOLDER_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const at = match.index ?? 0;
        if (seen.has(at)) continue;
        seen.add(at);
        hits.push({
          line: index + 1,
          excerpt: match[0],
        });
      }
    }
  });
  return hits;
}

const ACRONYM_ALLOW = new Set([
  "PDF",
  "DOC",
  "DOCX",
  "TXT",
  "MD",
  "URL",
  "URI",
  "HTML",
  "HTTP",
  "HTTPS",
  "JSON",
  "CSV",
  "XML",
  "QA",
  "AM",
  "PM",
  "OK",
  "US",
  "UK",
  "EU",
  "ID",
  "TBD",
  "TBA",
  "TODO",
  "FIXME",
]);

const ROMAN = new Set(["II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "XIII", "XIV", "XV", "XVI"]);

export function findDefinedAcronyms(text: string): Set<string> {
  const defined = new Set<string>();

  for (const match of text.matchAll(/\(([A-Z]{2,6})\)/g)) {
    const acronym = match[1];
    if (!acronym) continue;
    const before = text.slice(Math.max(0, (match.index ?? 0) - 80), match.index ?? 0);
    if (/[a-z]/.test(before)) defined.add(acronym);
  }

  for (const match of text.matchAll(/\b([A-Z]{2,6})\s+\(([^)]*[a-z][^)]*)\)/g)) {
    if (match[1]) defined.add(match[1]);
  }

  for (const line of text.split(/\n/)) {
    const match = /^\s*([A-Z]{2,6})\s*[:–—-]\s+\S+/.exec(line);
    if (match?.[1] && /[a-z]/.test(line)) defined.add(match[1]);
  }

  return defined;
}

export interface AcronymHit {
  acronym: string;
  line: number;
  count: number;
}

export function findUndefinedAcronyms(text: string, headingLines: Set<number>): AcronymHit[] {
  const defined = findDefinedAcronyms(text);
  const counts = new Map<string, AcronymHit>();
  const lines = text.split(/\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (headingLines.has(lineNumber)) return;
    if (!/[a-z]/.test(line)) return;
    for (const match of line.matchAll(/\b([A-Z]{2,6})\b/g)) {
      const acronym = match[1];
      if (!acronym) continue;
      if (ACRONYM_ALLOW.has(acronym) || ROMAN.has(acronym) || defined.has(acronym)) continue;
      if (/^X{2,6}$/.test(acronym)) continue;
      const existing = counts.get(acronym);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(acronym, { acronym, line: lineNumber, count: 1 });
      }
    }
  });

  return [...counts.values()];
}

export function splitSentences(text: string): string[] {
  const masked = text
    .replace(/\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Ms|Mrs|St|U\.S|U\.K)\./gi, (token) =>
      token.replaceAll(".", "\u0001"),
    )
    .replace(/\b([A-Z])\./g, (_match, letter: string) => `${letter}\u0001`);

  return masked
    .split(/[.!?]+/)
    .map((sentence) => sentence.replaceAll("\u0001", ".").replace(/\s+/g, " ").trim())
    .filter((sentence) => /[A-Za-z]/.test(sentence));
}

export function findLongSentences(prose: string, limit: number): string[] {
  return splitSentences(prose).filter((sentence) => wordCount(sentence) > limit);
}

export function proseWithoutHeadings(text: string, headingLines: Set<number>): string {
  return text
    .split(/\n/)
    .filter((_line, index) => !headingLines.has(index + 1))
    .join("\n");
}
