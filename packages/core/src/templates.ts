import type { SectionSpec, Template } from "./types.ts";

const CORE_SECTIONS: SectionSpec[] = [
  {
    id: "purpose",
    label: "Purpose",
    required: true,
    patterns: ["purpose", "purpose statement", "objective", "objectives"],
  },
  {
    id: "scope",
    label: "Scope",
    required: true,
    patterns: ["scope", "applicability"],
  },
  {
    id: "policy",
    label: "Policy",
    required: true,
    patterns: ["policy", "policy statement"],
  },
  {
    id: "procedure",
    label: "Procedure",
    required: true,
    patterns: ["procedure", "procedures", "process", "steps"],
  },
  {
    id: "responsibilities",
    label: "Responsibilities",
    required: true,
    patterns: ["responsibilities", "roles and responsibilities", "roles"],
  },
  {
    id: "definitions",
    label: "Definitions",
    required: true,
    patterns: ["definitions", "glossary", "key terms"],
  },
  {
    id: "references",
    label: "References",
    required: true,
    patterns: ["references", "related documents", "related policies"],
  },
  {
    id: "approval",
    label: "Approval / revision history",
    required: true,
    patterns: [
      "approval",
      "approvals",
      "revision history",
      "version history",
      "document history",
      "approval and revision history",
      "approval revision history",
    ],
  },
];

function withCore(extra: SectionSpec[] = []): SectionSpec[] {
  return [...CORE_SECTIONS.map((section) => ({ ...section, patterns: [...section.patterns] })), ...extra];
}

export const builtInTemplates: Template[] = [
  {
    id: "healthcare",
    name: "Healthcare policy",
    description:
      "Clinical and operational policies. Looks for the eight standard sections, plus an optional exceptions heading.",
    builtIn: true,
    staleReviewMonths: 12,
    sections: withCore([
      {
        id: "exceptions",
        label: "Exceptions",
        required: false,
        patterns: ["exceptions", "exemptions"],
      },
    ]),
  },
  {
    id: "it-security",
    name: "IT security policy",
    description:
      "Information security policies. Same required sections, with synonyms used in security procedures, plus an optional exceptions heading.",
    builtIn: true,
    staleReviewMonths: 12,
    sections: withCore([
      {
        id: "exceptions",
        label: "Exceptions",
        required: false,
        patterns: ["exceptions", "exemptions", "deviations"],
      },
    ]),
  },
  {
    id: "sop",
    name: "SOP",
    description:
      "Standard operating procedures. Procedure and responsibilities carry the same weight as in a policy, with an optional materials heading.",
    builtIn: true,
    staleReviewMonths: 12,
    sections: withCore([
      {
        id: "materials",
        label: "Materials",
        required: false,
        patterns: ["materials", "equipment", "supplies"],
      },
    ]),
  },
];

export function listTemplates(): Template[] {
  return builtInTemplates.map(cloneTemplate);
}

export function getTemplate(id: string): Template {
  const found = builtInTemplates.find((template) => template.id === id);
  if (!found) {
    const known = builtInTemplates.map((template) => template.id).join(", ");
    throw new Error(`Unknown template "${id}". Known templates: ${known}.`);
  }
  return cloneTemplate(found);
}

export function cloneTemplate(template: Template): Template {
  return {
    ...template,
    sections: template.sections.map((section) => ({
      ...section,
      patterns: [...section.patterns],
    })),
  };
}

export function assertTemplate(template: Template): void {
  if (!template.id.trim() || !template.name.trim()) {
    throw new Error("A template needs an id and a name.");
  }
  if (!Array.isArray(template.sections) || template.sections.length === 0) {
    throw new Error(`Template "${template.name}" needs at least one section.`);
  }
  const ids = new Set<string>();
  for (const section of template.sections) {
    if (!section.id.trim() || !section.label.trim()) {
      throw new Error("Each section needs an id and a label.");
    }
    if (ids.has(section.id)) {
      throw new Error(`Duplicate section id "${section.id}" in template "${template.name}".`);
    }
    ids.add(section.id);
    if (!section.patterns.some((pattern) => pattern.trim())) {
      throw new Error(`Section "${section.label}" needs at least one heading pattern.`);
    }
  }
}
