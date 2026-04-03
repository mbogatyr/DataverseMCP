# dataverse-mcp-server

MCP (Model Context Protocol) server for reading Microsoft Dataverse schema and data through the Dataverse Web API.

## Features

- List Dataverse tables and inspect table metadata
- Return practical, query-oriented columns for a specific table
- Exclude non-queryable companion/display attributes from schema output
- Query table records with OData-style filtering, sorting, paging, and field selection

## Tools

### `dataverse_get_schema`

Returns Dataverse metadata.

Modes:

1. List all tables: omit `entity_name`
2. Inspect one table: provide `entity_name`

Example prompts:

```text
What tables are available in Dataverse?
```

```text
Show the schema for the account table with columns and relationships
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `entity_name` | string | — | Table logical name, for example `account`, `contact`, `opportunity`. Omit it to list all tables |
| `include_columns` | boolean | `true` | Include column metadata such as type, required level, and read/write flags. Virtual and non-queryable companion/display attributes are excluded |
| `include_relationships` | boolean | `false` | Include 1:N, N:1, and N:N relationship metadata |
| `response_format` | `markdown` \| `json` | `markdown` | Response format |

### `dataverse_query_data`

Queries records from any Dataverse table with OData-style filtering.

Example prompt:

```text
Show 10 active accounts sorted by name
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `entity_set_name` | string | required | Table EntitySet name, for example `accounts`, `contacts`, `leads` |
| `select` | string[] | — | Columns to return via `$select` |
| `filter` | string | — | OData filter via `$filter` |
| `order_by` | string | — | OData order clause via `$orderby` |
| `top` | number | `50` | Number of records to return, max `5000` |
| `skip_token` | string | — | Token for the next page from the previous response |
| `count` | boolean | `false` | Include total record count via `$count=true` |
| `response_format` | `json` \| `markdown` | `json` | Response format |

Example filters:

```text
statecode eq 0
name eq 'Contoso Ltd'
revenue gt 100000
createdon ge 2024-01-01T00:00:00Z
contains(name, 'corp')
statecode eq 0 and revenue gt 50000
```

## Installation

### Prerequisites

- Node.js 18+
- A Microsoft Dataverse environment
- A Microsoft Entra ID app registration with Dataverse API access

### Install dependencies

```bash
npm install
npm run build
```

### Required environment variables

| Variable | Description |
|---|---|
| `DATAVERSE_URL` | Your Dataverse environment URL, for example `https://yourorg.crm.dynamics.com` |
| `AZURE_TENANT_ID` | Microsoft Entra ID tenant ID |
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |

## Connecting MCP Clients

### Codex

Add the server to `~/.codex/config.toml`:

```toml
[mcp_servers.dataversemcp]
command = "node"
args = ["/absolute/path/to/DataverseMCP/dist/index.js"]

[mcp_servers.dataversemcp.env]
DATAVERSE_URL = "https://yourorg.crm.dynamics.com"
AZURE_TENANT_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_CLIENT_SECRET = "your-client-secret"
```

If you want Codex to trust the project directory automatically, add a project entry:

```toml
[projects."/absolute/path/to/your/project"]
trust_level = "trusted"
```

After updating the config, restart Codex and confirm that the MCP server appears in the available tools list.

### Claude Desktop

Add the server to the Claude Desktop MCP config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dataverse": {
      "command": "node",
      "args": ["/absolute/path/to/DataverseMCP/dist/index.js"],
      "env": {
        "DATAVERSE_URL": "https://yourorg.crm.dynamics.com",
        "AZURE_TENANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AZURE_CLIENT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AZURE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Restart Claude Desktop after updating the config.

### MCP Inspector

Use MCP Inspector for local testing:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Dataverse setup

### 1. Register an app in Microsoft Entra ID

1. Open [portal.azure.com](https://portal.azure.com)
2. Go to `Microsoft Entra ID` > `App registrations` > `New registration`
3. Create an app, for example `DataverseMCPServer`
4. Copy the `Application (client) ID` and `Directory (tenant) ID`
5. Go to `Certificates & secrets` and create a client secret

### 2. Create an Application User in Dataverse

1. Open [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Select your environment
3. Go to `Settings` > `Users + permissions` > `Application users`
4. Create a new application user for the app from step 1

### 3. Assign a security role

1. Open the application user
2. Edit security roles
3. Assign a role with read access to the required tables, for example `Basic User` or a custom role

## Project structure

```text
dataverse-mcp-server/
├── src/
│   ├── index.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── schemas/
│   │   └── index.ts
│   ├── services/
│   │   └── dataverse.ts
│   └── tools/
│       ├── get-schema.ts
│       └── query-data.ts
├── dist/
├── package.json
└── tsconfig.json
```

## Development commands

```bash
npm run dev
npm run build
npm run clean
npm start
```

## Notes on schema filtering

`dataverse_get_schema` intentionally excludes columns that are misleading for OData querying, including:

- attributes with `AttributeType = Virtual`
- companion/display attributes marked as non-queryable by Dataverse metadata
- derived companion attributes linked through `AttributeOf`

This reduces invalid `$select` suggestions and helps keep schema output focused on fields that are practical to query through `dataverse_query_data`.
