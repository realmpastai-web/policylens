import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createPolicyLensServer } from "./server.ts";

const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

async function connect() {
  const server = createPolicyLensServer();
  const client = new Client({ name: "policylens-test", version: "1.0.0" });
  clients.push(client);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

const POLICY = `
Owner: Avery Chen
Approver: Jordan Blake
Effective Date: 2026-03-01
Last Reviewed: 2024-01-15
Next Review: 2027-03-01

## Purpose
This policy states the rule for visitor sign-in at the clinic.

## Scope
The rule applies to the front desk and the side entrance.

## Policy
Every visitor signs the book before entering a care area.

## Procedure
The desk checks the name and writes the arrival time.

## Responsibilities
The desk lead keeps the book for the whole shift.

## Definitions
No specialised abbreviations are required in this document.

## References
See the building access standard for the book layout.

## Approval
The operations lead approved version 1 on the effective date.
`;

describe("PolicyLens MCP server", () => {
  it("lists templates, checks a document, and explains a finding", async () => {
    const client = await connect();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "check_policy_document",
      "explain_finding",
      "list_templates",
    ]);

    const listed = await client.callTool({ name: "list_templates", arguments: {} });
    const listedText = textOf(listed);
    expect(listedText).toContain("it-security");
    expect(listedText).toContain("Healthcare policy");

    const checked = await client.callTool({
      name: "check_policy_document",
      arguments: { text: POLICY, template: "healthcare", referenceDate: "2026-06-01" },
    });
    const checkedText = textOf(checked);
    expect(checkedText).toContain("stale_review");
    expect(checkedText).toMatch(/Score \d+\/100/);

    const explained = await client.callTool({
      name: "explain_finding",
      arguments: { checkId: "stale_review" },
    });
    expect(textOf(explained)).toContain("howToFix");

    const missing = await client.callTool({
      name: "explain_finding",
      arguments: { checkId: "not-a-check" },
    });
    expect(missing.isError).toBe(true);

    const unknown = await client.callTool({
      name: "check_policy_document",
      arguments: { text: "Hello", template: "nope" },
    });
    expect(unknown.isError).toBe(true);
    expect(textOf(unknown)).toContain("Unknown template");
  });
});

function textOf(result: unknown): string {
  if (!result || typeof result !== "object" || !("content" in result)) return "";
  const content = result.content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => (item && typeof item === "object" && "text" in item ? String(item.text) : ""))
    .join("\n");
}
