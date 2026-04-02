import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

// ─── dataverse_get_schema ────────────────────────────────────────────────────

export const GetSchemaInputSchema = z
  .object({
    entity_name: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Logical name of the Dataverse table (e.g. 'account', 'contact'). " +
          "Omit to list all available tables."
      ),
    include_columns: z
      .boolean()
      .default(true)
      .describe(
        "Include column (attribute) metadata: name, type, required level. " +
          "Only applies when entity_name is specified."
      ),
    include_relationships: z
      .boolean()
      .default(false)
      .describe(
        "Include relationship metadata (1:N, N:1, N:N). " +
          "Only applies when entity_name is specified."
      ),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable."),
  })
  .strict();

export type GetSchemaInput = z.infer<typeof GetSchemaInputSchema>;

// ─── dataverse_query_data ────────────────────────────────────────────────────

export const QueryDataInputSchema = z
  .object({
    entity_set_name: z
      .string()
      .min(1)
      .describe(
        "EntitySet name of the Dataverse table (e.g. 'accounts', 'contacts', 'leads'). " +
          "Use dataverse_get_schema to find the correct EntitySet name."
      ),
    select: z
      .array(z.string().min(1))
      .optional()
      .describe(
        "List of column logical names to return ($select). " +
          "Omit to return all columns (not recommended for large tables)."
      ),
    filter: z
      .string()
      .optional()
      .describe(
        "OData filter expression ($filter). Examples: " +
          "'statecode eq 0', " +
          "'name eq \\'Contoso\\'', " +
          "'createdon ge 2024-01-01T00:00:00Z', " +
          "'contains(name, \\'corp\\')'."
      ),
    order_by: z
      .string()
      .optional()
      .describe(
        "OData sort expression ($orderby). Examples: 'name asc', 'createdon desc', 'name asc,createdon desc'."
      ),
    top: z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE)
      .describe(`Maximum number of records to return (default: ${DEFAULT_PAGE_SIZE}, max: ${MAX_PAGE_SIZE}).`),
    skip_token: z
      .string()
      .optional()
      .describe(
        "Pagination token from a previous response's skip_token field. " +
          "Pass this to retrieve the next page of results."
      ),
    count: z
      .boolean()
      .default(false)
      .describe("Include total record count in the response ($count=true). May impact performance."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.JSON)
      .describe("Output format: 'json' for machine-readable, 'markdown' for human-readable table."),
  })
  .strict();

export type QueryDataInput = z.infer<typeof QueryDataInputSchema>;
