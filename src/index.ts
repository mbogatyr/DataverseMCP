#!/usr/bin/env node
/**
 * dataverse-mcp-server
 *
 * MCP server for Microsoft Dataverse Web API.
 * Provides tools to read table schema and query records.
 *
 * Required environment variables:
 *   DATAVERSE_URL        — e.g. https://yourorg.crm.dynamics.com
 *   AZURE_TENANT_ID      — Microsoft Entra ID tenant ID
 *   AZURE_CLIENT_ID      — App Registration client ID
 *   AZURE_CLIENT_SECRET  — App Registration client secret
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DataverseClient, getRequiredEnv } from "./services/dataverse.js";
import { registerGetSchemaTool } from "./tools/get-schema.js";
import { registerQueryDataTool } from "./tools/query-data.js";

function validateEnv(): void {
  const required = [
    "DATAVERSE_URL",
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
  ];

  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `[dataverse-mcp-server] Missing required environment variables: ${missing.join(", ")}`
    );
    console.error(
      "Set them before starting the server:\n" +
        "  DATAVERSE_URL=https://yourorg.crm.dynamics.com\n" +
        "  AZURE_TENANT_ID=<tenant-id>\n" +
        "  AZURE_CLIENT_ID=<client-id>\n" +
        "  AZURE_CLIENT_SECRET=<client-secret>"
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateEnv();

  const client = new DataverseClient();

  const server = new McpServer({
    name: "dataverse-mcp-server",
    version: "1.0.0",
  });

  registerGetSchemaTool(server, client);
  registerQueryDataTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[dataverse-mcp-server] Running via stdio");
}

main().catch((error: unknown) => {
  console.error("[dataverse-mcp-server] Fatal error:", error);
  process.exit(1);
});
