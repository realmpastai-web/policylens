import { builtInTemplates, assertTemplate, cloneTemplate, type Template } from "@policylens/core";
import { useSyncExternalStore } from "react";
import { isValidLicense, normalizeLicense } from "./license.ts";

const STORAGE_KEY = "policylens.state.v1";

export interface AppState {
  staleReviewMonths: number;
  orgName: string;
  templateId: string;
  overrides: Record<string, Template>;
  custom: Template[];
  license: string;
}

const defaultState: AppState = {
  staleReviewMonths: 12,
  orgName: "",
  templateId: "healthcare",
  overrides: {},
  custom: [],
  license: "",
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function asTemplate(value: unknown): Template | null {
  if (!value || typeof value !== "object") return null;
  try {
    assertTemplate(value as Template);
    return cloneTemplate(value as Template);
  } catch {
    return null;
  }
}

function load(): AppState {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const overrides: Record<string, Template> = {};
    if (parsed.overrides && typeof parsed.overrides === "object") {
      for (const template of builtInTemplates) {
        const saved = asTemplate(parsed.overrides[template.id]);
        if (saved && saved.id === template.id) overrides[template.id] = { ...saved, builtIn: true };
      }
    }
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom
          .map(asTemplate)
          .filter((template): template is Template => template !== null && !template.builtIn)
          .filter((template) => !builtInTemplates.some((builtIn) => builtIn.id === template.id))
      : [];
    const months = Number(parsed.staleReviewMonths);
    const templateId = typeof parsed.templateId === "string" ? parsed.templateId : defaultState.templateId;
    return {
      staleReviewMonths: Number.isFinite(months) ? Math.min(120, Math.max(0, Math.round(months))) : 12,
      orgName: typeof parsed.orgName === "string" ? parsed.orgName.slice(0, 80) : "",
      templateId,
      overrides,
      custom,
      license: typeof parsed.license === "string" ? normalizeLicense(parsed.license) : "",
    };
  } catch {
    return defaultState;
  }
}

let state = load();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(next: AppState): void {
  state = next;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function isPro(app: AppState = state): boolean {
  return isValidLicense(app.license);
}

export function activeTemplates(app: AppState = state): Template[] {
  const builtIn = builtInTemplates.map((template) => app.overrides[template.id] ?? template);
  return isPro(app) ? [...builtIn, ...app.custom] : builtIn;
}

export function selectedTemplate(app: AppState = state): Template {
  const templates = activeTemplates(app);
  return templates.find((template) => template.id === app.templateId) ?? templates[0] ?? builtInTemplates[0];
}

export function updateState(patch: Partial<AppState>): void {
  persist({ ...state, ...patch });
}

export function saveTemplate(template: Template): void {
  assertTemplate(template);
  const copy = cloneTemplate(template);
  if (copy.builtIn) {
    persist({ ...state, overrides: { ...state.overrides, [copy.id]: copy }, templateId: copy.id });
    return;
  }
  const exists = state.custom.some((item) => item.id === copy.id);
  persist({
    ...state,
    templateId: copy.id,
    custom: exists ? state.custom.map((item) => (item.id === copy.id ? copy : item)) : [...state.custom, copy],
  });
}

export function resetBuiltIn(id: string): void {
  const overrides = { ...state.overrides };
  delete overrides[id];
  persist({ ...state, overrides });
}

export function deleteCustom(id: string): void {
  const custom = state.custom.filter((template) => template.id !== id);
  persist({
    ...state,
    custom,
    templateId: state.templateId === id ? "healthcare" : state.templateId,
  });
}

export function setLicense(value: string): void {
  persist({ ...state, license: normalizeLicense(value) });
}
