import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import { GetSchemaInputSchema, ResponseFormat, type GetSchemaInput } from "../schemas/index.js";
import type { DataverseClient } from "../services/dataverse.js";
import { handleApiError } from "../services/dataverse.js";
import type {
  AttributeMetadata,
  EntityListItem,
  EntityMetadata,
  Label,
  RelationshipMetadata,
} from "../types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLabel(label?: Label): string {
  return label?.UserLocalizedLabel?.Label ?? "";
}

function formatAttributeType(attr: AttributeMetadata): string {
  return attr.AttributeType ?? "Unknown";
}

// ─── List all tables ──────────────────────────────────────────────────────────

async function listEntities(
  client: DataverseClient,
  format: ResponseFormat
): Promise<{ text: string; data: EntityListItem[] }> {
  const response = await client.getCollection<EntityListItem>(
    "/EntityDefinitions",
    {
      $select:
        "LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity",
    }
  );

  const entities = response.value;

  if (format === ResponseFormat.JSON) {
    const text = JSON.stringify({ count: entities.length, entities }, null, 2);
    return { text: truncate(text), data: entities };
  }

  // Markdown
  const lines: string[] = [
    `# Dataverse Tables (${entities.length} total)`,
    "",
    "| Logical Name | Display Name | EntitySet Name | Primary ID | Custom |",
    "|---|---|---|---|---|",
  ];

  for (const e of entities) {
    lines.push(
      `| \`${e.LogicalName}\` | ${getLabel(e.DisplayName)} | \`${e.EntitySetName ?? ""}\` | \`${e.PrimaryIdAttribute ?? ""}\` | ${e.IsCustomEntity ? "Yes" : "No"} |`
    );
  }

  return { text: truncate(lines.join("\n")), data: entities };
}

// ─── Get single entity schema ─────────────────────────────────────────────────

async function getEntitySchema(
  client: DataverseClient,
  entityName: string,
  includeColumns: boolean,
  includeRelationships: boolean,
  format: ResponseFormat
): Promise<{ text: string; data: EntityMetadata }> {
  const expandParts: string[] = [];

  if (includeColumns) {
    expandParts.push(
      "Attributes($select=LogicalName,SchemaName,DisplayName,AttributeType,IsValidForRead,IsValidForCreate,IsValidForUpdate,RequiredLevel,IsPrimaryId,IsPrimaryName)"
    );
  }

  if (includeRelationships) {
    expandParts.push(
      "OneToManyRelationships($select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencedAttribute,ReferencingAttribute)",
      "ManyToOneRelationships($select=SchemaName,ReferencedEntity,ReferencingEntity,ReferencedAttribute,ReferencingAttribute)",
      "ManyToManyRelationships($select=SchemaName,Entity1LogicalName,Entity2LogicalName)"
    );
  }

  const params: Record<string, string> = {
    $select:
      "MetadataId,LogicalName,SchemaName,DisplayName,DisplayCollectionName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity,IsActivity,Description",
  };

  if (expandParts.length > 0) {
    params["$expand"] = expandParts.join(",");
  }

  const entity = await client.get<EntityMetadata>(
    `/EntityDefinitions(LogicalName='${entityName}')`,
    params
  );

  if (format === ResponseFormat.JSON) {
    return { text: truncate(JSON.stringify(entity, null, 2)), data: entity };
  }

  // Markdown
  const lines: string[] = [
    `# Table: ${getLabel(entity.DisplayName) || entity.LogicalName}`,
    "",
    `| Property | Value |`,
    `|---|---|`,
    `| Logical Name | \`${entity.LogicalName}\` |`,
    `| Schema Name | \`${entity.SchemaName}\` |`,
    `| EntitySet Name | \`${entity.EntitySetName ?? ""}\` |`,
    `| Primary ID | \`${entity.PrimaryIdAttribute ?? ""}\` |`,
    `| Primary Name | \`${entity.PrimaryNameAttribute ?? ""}\` |`,
    `| Custom Entity | ${entity.IsCustomEntity ? "Yes" : "No"} |`,
    `| Is Activity | ${entity.IsActivity ? "Yes" : "No"} |`,
  ];

  const desc = getLabel(entity.Description);
  if (desc) lines.push(`| Description | ${desc} |`);

  if (includeColumns && entity.Attributes && entity.Attributes.length > 0) {
    lines.push("", `## Columns (${entity.Attributes.length})`, "");
    lines.push("| Logical Name | Display Name | Type | Required | Readable | Creatable | Updatable |");
    lines.push("|---|---|---|---|---|---|---|");

    const sorted = [...entity.Attributes].sort((a, b) =>
      a.LogicalName.localeCompare(b.LogicalName)
    );

    for (const attr of sorted) {
      const req = attr.RequiredLevel?.Value ?? "";
      lines.push(
        `| \`${attr.LogicalName}\` | ${getLabel(attr.DisplayName)} | ${formatAttributeType(attr)} | ${req} | ${attr.IsValidForRead ? "✓" : ""} | ${attr.IsValidForCreate ? "✓" : ""} | ${attr.IsValidForUpdate ? "✓" : ""} |`
      );
    }
  }

  if (includeRelationships) {
    appendRelationships(lines, "1:N (One-to-Many)", entity.OneToManyRelationships);
    appendRelationships(lines, "N:1 (Many-to-One)", entity.ManyToOneRelationships);
    appendManyToMany(lines, entity.ManyToManyRelationships);
  }

  return { text: truncate(lines.join("\n")), data: entity };
}

function appendRelationships(
  lines: string[],
  title: string,
  rels?: RelationshipMetadata[]
): void {
  if (!rels || rels.length === 0) return;
  lines.push("", `## Relationships: ${title} (${rels.length})`, "");
  lines.push("| Schema Name | Referenced Entity | Referencing Entity | Ref. Attribute | Refing. Attribute |");
  lines.push("|---|---|---|---|---|");
  for (const r of rels) {
    lines.push(
      `| \`${r.SchemaName}\` | \`${r.ReferencedEntity ?? ""}\` | \`${r.ReferencingEntity ?? ""}\` | \`${r.ReferencedAttribute ?? ""}\` | \`${r.ReferencingAttribute ?? ""}\` |`
    );
  }
}

function appendManyToMany(
  lines: string[],
  rels?: RelationshipMetadata[]
): void {
  if (!rels || rels.length === 0) return;
  lines.push("", `## Relationships: N:N (Many-to-Many) (${rels.length})`, "");
  lines.push("| Schema Name | Entity 1 | Entity 2 |");
  lines.push("|---|---|---|");
  for (const r of rels) {
    lines.push(
      `| \`${r.SchemaName}\` | \`${r.Entity1LogicalName ?? ""}\` | \`${r.Entity2LogicalName ?? ""}\` |`
    );
  }
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n... [Response truncated at ${CHARACTER_LIMIT} chars. Use entity_name to query a specific table or reduce include_columns/include_relationships.]`
  );
}

// ─── Tool registration ────────────────────────────────────────────────────────

export function registerGetSchemaTool(
  server: McpServer,
  client: DataverseClient
): void {
  server.registerTool(
    "dataverse_get_schema",
    {
      title: "Get Dataverse Table Schema",
      description: `Retrieve schema (metadata) information from Microsoft Dataverse.

Two modes:
1. **List all tables** — omit entity_name to get a list of all available tables with their EntitySet names.
2. **Single table detail** — specify entity_name to get full metadata for one table including columns and optionally relationships.

Args:
  - entity_name (string, optional): Logical name of the table (e.g. 'account', 'contact', 'opportunity'). Omit to list all tables.
  - include_columns (boolean, default: true): Return column definitions (type, required level, read/write flags). Only used when entity_name is specified.
  - include_relationships (boolean, default: false): Return 1:N, N:1 and N:N relationship metadata. Only used when entity_name is specified.
  - response_format ('markdown'|'json', default: 'markdown'): Output format.

Returns (entity_name omitted):
  List of tables with LogicalName, EntitySetName, PrimaryIdAttribute, IsCustomEntity.

Returns (entity_name specified):
  Table properties + columns (LogicalName, Type, RequiredLevel, read/write flags) + optional relationships.

Examples:
  - "What tables are available?" → omit entity_name
  - "Show me the schema for accounts" → entity_name='account'
  - "What columns does the contact table have?" → entity_name='contact', include_columns=true
  - "Show relationships for opportunity" → entity_name='opportunity', include_relationships=true`,
      inputSchema: GetSchemaInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetSchemaInput) => {
      try {
        if (!params.entity_name) {
          const { text, data } = await listEntities(client, params.response_format);
          return {
            content: [{ type: "text", text }],
            structuredContent: { count: data.length, entities: data } as Record<string, unknown>,
          };
        }

        const { text, data } = await getEntitySchema(
          client,
          params.entity_name,
          params.include_columns,
          params.include_relationships,
          params.response_format
        );

        return {
          content: [{ type: "text", text }],
          structuredContent: data as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );
}
