import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { analyzeDocument, explainCheck, listTemplates } from "@policylens/core";
import { z } from "zod";

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function createPolicyLensServer(): McpServer {
  const server = new McpServer({
    name: "policylens",
    version: "1.0.0",
  });

  server.registerTool(
    "list_templates",
    {
      title: "List policy checklists",
      description:
        "List the built-in PolicyLens checklists (healthcare, IT security, SOP) and the sections each one expects.",
      inputSchema: {},
    },
    async () => {
      const templates = listTemplates().map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        staleReviewMonths: template.staleReviewMonths ?? 12,
        sections: template.sections.map((section) => ({
          id: section.id,
          label: section.label,
          required: section.required,
          patterns: section.patterns,
        })),
      }));
      return textResult(JSON.stringify(templates, null, 2));
    },
  );

  server.registerTool(
    "check_policy_document",
    {
      title: "Check a policy document",
      description:
        "Run the PolicyLens rules engine on policy or procedure text. Returns a QA score, section checklist, metadata, and findings. The same engine runs in the web app.",
      inputSchema: {
        text: z.string().describe("Full text of the policy or procedure."),
        template: z
          .string()
          .optional()
          .describe("Checklist id: healthcare, it-security, or sop. Defaults to healthcare."),
        referenceDate: z
          .string()
          .optional()
          .describe("Date of the check, YYYY-MM-DD. Defaults to today (UTC)."),
        staleReviewMonths: z
          .number()
          .optional()
          .describe("Flag a last review strictly older than this many months. Default 12."),
      },
    },
    async ({ text, template, referenceDate, staleReviewMonths }) => {
      try {
        const analysis = analyzeDocument(text, { template, referenceDate, staleReviewMonths });
        const high = analysis.findings.filter((finding) => finding.severity === "high").length;
        const summary = `Score ${analysis.score.total}/100 on “${analysis.templateName}”. ${analysis.findings.length} finding${analysis.findings.length === 1 ? "" : "s"}, ${high} high. Check date ${analysis.referenceDate}.`;
        return textResult(`${summary}\n\n${JSON.stringify(analysis, null, 2)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The check failed.";
        return textResult(message, true);
      }
    },
  );

  server.registerTool(
    "explain_finding",
    {
      title: "Explain a PolicyLens check",
      description:
        "Explain what one PolicyLens check looks for, why it matters, and how to fix a document that failed it.",
      inputSchema: {
        checkId: z
          .string()
          .describe(
            "Check id, for example missing_section, stale_review, placeholder_text, or undefined_acronym.",
          ),
      },
    },
    async ({ checkId }) => {
      const explanation = explainCheck(checkId);
      if (!explanation) {
        return textResult(
          `Unknown check "${checkId}". Call check_policy_document and use a checkId from its findings.`,
          true,
        );
      }
      return textResult(JSON.stringify(explanation, null, 2));
    },
  );

  return server;
}
