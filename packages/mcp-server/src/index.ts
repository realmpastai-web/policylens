import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { createPolicyLensServer } from "./server.ts";

const entry = process.argv[1];
const launchedDirectly = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (launchedDirectly) {
  const server = createPolicyLensServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
