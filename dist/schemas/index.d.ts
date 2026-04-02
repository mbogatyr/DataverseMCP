import { z } from "zod";
export declare enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}
export declare const GetSchemaInputSchema: z.ZodObject<{
    entity_name: z.ZodOptional<z.ZodString>;
    include_columns: z.ZodDefault<z.ZodBoolean>;
    include_relationships: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    include_columns: boolean;
    include_relationships: boolean;
    response_format: ResponseFormat;
    entity_name?: string | undefined;
}, {
    entity_name?: string | undefined;
    include_columns?: boolean | undefined;
    include_relationships?: boolean | undefined;
    response_format?: ResponseFormat | undefined;
}>;
export type GetSchemaInput = z.infer<typeof GetSchemaInputSchema>;
export declare const QueryDataInputSchema: z.ZodObject<{
    entity_set_name: z.ZodString;
    select: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    filter: z.ZodOptional<z.ZodString>;
    order_by: z.ZodOptional<z.ZodString>;
    top: z.ZodDefault<z.ZodNumber>;
    skip_token: z.ZodOptional<z.ZodString>;
    count: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    entity_set_name: string;
    top: number;
    count: boolean;
    filter?: string | undefined;
    select?: string[] | undefined;
    order_by?: string | undefined;
    skip_token?: string | undefined;
}, {
    entity_set_name: string;
    response_format?: ResponseFormat | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    order_by?: string | undefined;
    top?: number | undefined;
    skip_token?: string | undefined;
    count?: boolean | undefined;
}>;
export type QueryDataInput = z.infer<typeof QueryDataInputSchema>;
//# sourceMappingURL=index.d.ts.map