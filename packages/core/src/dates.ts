const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

export function utcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Read the first date in a string. Numeric dates are month/day/year. */
export function parseDate(value: string): Date | null {
  const text = value.trim();

  const iso = /\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/.exec(text);
  if (iso) {
    return utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const monthFirst = new RegExp(
    `\\b(${MONTH_ALT})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
    "i",
  ).exec(text);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    return utcDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\s+(\\d{4})\\b`,
    "i",
  ).exec(text);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()];
    return utcDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  const slash = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(text);
  if (slash) {
    return utcDate(Number(slash[3]), Number(slash[1]), Number(slash[2]));
  }

  return null;
}

export function startOfUtcDay(input?: Date | string): Date {
  if (!input) {
    const now = new Date();
    return utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())!;
  }
  if (input instanceof Date) {
    return utcDate(input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate())!;
  }
  const parsed = parseDate(input);
  if (!parsed) {
    throw new Error(`Unreadable reference date: ${input}`);
  }
  return parsed;
}

/**
 * True when `reviewed` is strictly more than `months` before `reference`.
 * An anniversary on the same month and day is not stale.
 */
export function isOlderThanMonths(reviewed: Date, reference: Date, months: number): boolean {
  const cutoff = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() - months,
      reference.getUTCDate(),
    ),
  );
  return reviewed.getTime() < cutoff.getTime();
}
