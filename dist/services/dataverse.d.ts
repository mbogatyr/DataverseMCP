import type { ODataCollectionResponse } from "../types.js";
export declare function getRequiredEnv(name: string): string;
export declare class DataverseClient {
    private readonly baseUrl;
    private readonly apiBase;
    private readonly msalApp;
    private readonly scope;
    private readonly http;
    constructor();
    private getAccessToken;
    get<T>(path: string, params?: Record<string, string>): Promise<T>;
    getCollection<T>(path: string, params?: Record<string, string>): Promise<ODataCollectionResponse<T>>;
}
export declare function handleApiError(error: unknown): string;
//# sourceMappingURL=dataverse.d.ts.map