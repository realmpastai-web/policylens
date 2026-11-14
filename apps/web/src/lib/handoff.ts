import { SAMPLE_NAME, SAMPLE_POLICY } from "../sample.ts";

export interface PendingDocument {
  name: string;
  text: string;
}

const PENDING_KEY = "policylens.pending-document";
let memory: PendingDocument | null = null;
let clearTimer = 0;

function stage(document: PendingDocument): void {
  memory = document;
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(document));
  } catch {
    // In-memory copy still works for this tab.
  }
  window.clearTimeout(clearTimer);
  if (location.hash === "#/review") {
    window.dispatchEvent(new Event("policylens-open"));
  } else {
    location.hash = "#/review";
  }
}

export function openInReview(name: string, text: string): void {
  stage({ name, text });
}

export function requestSample(): void {
  stage({ name: SAMPLE_NAME, text: SAMPLE_POLICY });
}

export function consumePending(): PendingDocument | null {
  let value = memory;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw) value = JSON.parse(raw) as PendingDocument;
  } catch {
    value = memory;
  }
  if (!value?.text) return null;
  window.clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => {
    memory = null;
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      // Already gone.
    }
  }, 250);
  return value;
}
