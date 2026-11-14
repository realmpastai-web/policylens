export interface HeadingHit {
  text: string;
  line: number;
  lineIndex: number;
}

export interface Block {
  heading: string;
  line: number;
  body: string;
}

export function normalizeHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)*[.)]\s+/, "")
    .replace(/[*_`#]+/g, "")
    .replace(/[/:&|–—-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromMarkdown(line: string): string | null {
  const match = /^(#{1,6})\s+(\S.*)$/.exec(line.trim());
  if (!match) return null;
  return match[2].replace(/[:：]\s*$/, "").trim();
}

function titleFromNumbered(line: string): string | null {
  const match = /^(\d+(?:\.\d+)*)[.)]\s+(\S.*)$/.exec(line.trim());
  if (!match) return null;
  const title = match[2].trim().replace(/[:：]\s*$/, "");
  if (title.length > 80 || title.split(/\s+/).length > 12) return null;
  if (/[.!?]$/.test(title)) return null;
  return title;
}

function titleFromCaps(line: string, patterns: Set<string>): string | null {
  const title = line.trim();
  if (title.length < 3 || title.length > 60) return null;
  if (!/^[A-Z][A-Z0-9 /&'-]*$/.test(title)) return null;
  const words = title.split(/\s+/);
  if (words.length > 8) return null;
  if (words.length === 1 && title.length < 5 && !patterns.has(normalizeHeading(title))) {
    return null;
  }
  return title;
}

function titleFromKnownLine(line: string, patterns: Set<string>): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  if (/[:：]/.test(trimmed) || /[.!?]/.test(trimmed)) return null;
  if (trimmed.split(/\s+/).length > 8) return null;
  const normalized = normalizeHeading(trimmed);
  if (!patterns.has(normalized)) return null;
  return trimmed.replace(/[:：]\s*$/, "");
}

export function findHeadings(text: string, patterns: string[]): HeadingHit[] {
  const patternSet = new Set(patterns.map(normalizeHeading).filter(Boolean));
  const lines = text.split(/\n/);
  const headings: HeadingHit[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const next = lines[index + 1] ?? "";
    const markdown = titleFromMarkdown(line);
    const underline =
      line.trim() &&
      /^(=|-){3,}\s*$/.test(next) &&
      line.trim().length <= 80 &&
      line.trim().split(/\s+/).length <= 12
        ? line.trim()
        : null;

    const title =
      markdown ??
      underline ??
      titleFromNumbered(line) ??
      titleFromCaps(line, patternSet) ??
      titleFromKnownLine(line, patternSet);

    if (!title) continue;
    headings.push({ text: title, line: index + 1, lineIndex: index });
    if (underline) index += 1;
  }

  return headings;
}

export function blocksFromHeadings(text: string, headings: HeadingHit[]): Block[] {
  const lines = text.split(/\n/);
  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const start = heading.lineIndex + 1;
    const end = next ? next.lineIndex : lines.length;
    // Drop a markdown underline row if it survived as the first body line.
    const bodyLines = lines.slice(start, end);
    if (bodyLines[0] && /^(=|-){3,}\s*$/.test(bodyLines[0])) {
      bodyLines.shift();
    }
    return {
      heading: heading.text,
      line: heading.line,
      body: bodyLines.join("\n").trim(),
    };
  });
}

export function wordCount(value: string): number {
  const words = value.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g);
  return words ? words.length : 0;
}
