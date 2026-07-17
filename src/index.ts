#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { Store } from "./store/store.js";

/**
 * Entry point: wire the store to a stdio transport. The client (Claude Code,
 * MCP Inspector, …) launches this over stdin/stdout, so nothing may be written
 * to stdout except the JSON-RPC stream — all logging goes to stderr.
 */
async function main(): Promise<void> {
  const filePath =
    process.env.DIETCALIBRATOR_DATA_FILE ??
    join(homedir(), ".dietcalibrator-mcp", "data.json");

  const store = new Store({ filePath });
  const server = createServer(store);

  await server.connect(new StdioServerTransport());
  console.error(
    `${SERVER_NAME} v${SERVER_VERSION} ready (data: ${filePath})`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
