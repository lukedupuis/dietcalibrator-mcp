import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts } from "./mcp/prompts.js";
import { registerResources } from "./mcp/resources.js";
import { registerTools } from "./mcp/tools.js";
import type { Store } from "./store/store.js";

export const SERVER_NAME = "dietcalibrator-mcp";
export const SERVER_VERSION = "0.1.0";

/**
 * Build a fully-wired MCP server over the given store. Kept transport-agnostic
 * so tests can drive it in-memory and `index.ts` can attach stdio.
 */
export function createServer(store: Store): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(server, store);
  registerResources(server, store);
  registerPrompts(server, store);

  return server;
}
