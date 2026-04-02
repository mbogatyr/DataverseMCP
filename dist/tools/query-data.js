import { CHARACTER_LIMIT } from "../constants.js";
import { QueryDataInputSchema, ResponseFormat } from "../schemas/index.js";
import { handleApiError } from "../services/dataverse.js";
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Extracts the $skiptoken value from an @odata.nextLink URL so callers
 * don't need to pass the full URL.
 */
function extractSkipToken(nextLink) {
    try {
        const url = new URL(nextLink);
        return url.searchParams.get("$skiptoken") ?? nextLink;
    }
    catch {
        return nextLink;
    }
}
function buildODataParams(params) {
    const query = {};
    if (params.select && params.select.length > 0) {
        query["$select"] = params.select.join(",");
    }
    if (params.filter) {
        query["$filter"] = params.filter;
    }
    if (params.order_by) {
        query["$orderby"] = params.order_by;
    }
    if (params.top) {
        query["$top"] = String(params.top);
    }
    if (params.count) {
        query["$count"] = "true";
    }
    if (params.skip_token) {
        query["$skiptoken"] = params.skip_token;
    }
    return query;
}
function formatAsMarkdown(result, entitySet) {
    if (result.records.length === 0) {
        return `# Query Results: \`${entitySet}\`\n\nNo records found.`;
    }
    const lines = [
        `# Query Results: \`${entitySet}\``,
        "",
    ];
    if (result.total_count !== undefined) {
        lines.push(`**Total records:** ${result.total_count}`);
    }
    lines.push(`**Returned:** ${result.count}`);
    if (result.has_more) {
        lines.push(`**More pages available** — use skip_token: \`${result.skip_token ?? ""}\``);
    }
    lines.push("");
    // Build table header from first record's keys (excluding OData annotations)
    const firstRecord = result.records[0];
    if (!firstRecord)
        return lines.join("\n");
    const columns = Object.keys(firstRecord).filter((k) => !k.startsWith("@") && !k.endsWith("@OData.Community.Display.V1.FormattedValue"));
    lines.push(`| ${columns.join(" | ")} |`);
    lines.push(`| ${columns.map(() => "---").join(" | ")} |`);
    for (const record of result.records) {
        const cells = columns.map((col) => {
            const val = record[col];
            if (val === null || val === undefined)
                return "";
            return String(val).replace(/\|/g, "\\|").replace(/\n/g, " ");
        });
        lines.push(`| ${cells.join(" | ")} |`);
    }
    return lines.join("\n");
}
function truncate(text) {
    if (text.length <= CHARACTER_LIMIT)
        return text;
    return (text.slice(0, CHARACTER_LIMIT) +
        `\n\n... [Response truncated at ${CHARACTER_LIMIT} chars. Use $select to limit columns or reduce $top value.]`);
}
// ─── Tool registration ────────────────────────────────────────────────────────
export function registerQueryDataTool(server, client) {
    server.registerTool("dataverse_query_data", {
        title: "Query Dataverse Data",
        description: `Retrieve records from any Microsoft Dataverse table using OData query options.

Args:
  - entity_set_name (string, required): EntitySet name of the table (e.g. 'accounts', 'contacts', 'leads', 'opportunities'). Use dataverse_get_schema to find correct names.
  - select (string[], optional): Column logical names to return. Omit for all columns (slow on large tables).
  - filter (string, optional): OData $filter expression. Examples:
      'statecode eq 0'
      'name eq \\'Contoso Ltd\\''
      'revenue gt 100000'
      'createdon ge 2024-01-01T00:00:00Z'
      'contains(name, \\'corp\\')'
      'statecode eq 0 and revenue gt 50000'
  - order_by (string, optional): OData $orderby. Examples: 'name asc', 'createdon desc', 'name asc,revenue desc'.
  - top (number, default: 50, max: 5000): Number of records to return per page.
  - skip_token (string, optional): Pagination token from previous response to fetch next page.
  - count (boolean, default: false): Include total record count (adds overhead).
  - response_format ('json'|'markdown', default: 'json'): Output format.

Returns:
  {
    "entity_set": string,       // EntitySet queried
    "total_count": number,      // Total matching records (only if count=true)
    "count": number,            // Records in this response
    "records": object[],        // Array of record objects
    "has_more": boolean,        // Whether more pages exist
    "skip_token": string        // Token for next page (if has_more=true)
  }

Examples:
  - "Get all active accounts" → entity_set_name='accounts', filter='statecode eq 0'
  - "Show contact names and emails" → entity_set_name='contacts', select=['fullname','emailaddress1']
  - "Top 10 opportunities by revenue" → entity_set_name='opportunities', top=10, order_by='estimatedvalue desc'
  - "Next page" → entity_set_name='accounts', skip_token='<token from previous response>'`,
        inputSchema: QueryDataInputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const odataParams = buildODataParams(params);
            const response = await client.getCollection(`/${params.entity_set_name}`, odataParams);
            const records = response.value;
            const hasMore = !!response["@odata.nextLink"];
            const skipToken = hasMore
                ? extractSkipToken(response["@odata.nextLink"])
                : undefined;
            const result = {
                entity_set: params.entity_set_name,
                count: records.length,
                records,
                has_more: hasMore,
                ...(response["@odata.count"] !== undefined
                    ? { total_count: response["@odata.count"] }
                    : {}),
                ...(skipToken ? { skip_token: skipToken } : {}),
            };
            let text;
            if (params.response_format === ResponseFormat.MARKDOWN) {
                text = formatAsMarkdown(result, params.entity_set_name);
            }
            else {
                text = JSON.stringify(result, null, 2);
            }
            return {
                content: [{ type: "text", text: truncate(text) }],
                structuredContent: result,
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: handleApiError(error) }],
            };
        }
    });
}
//# sourceMappingURL=query-data.js.map