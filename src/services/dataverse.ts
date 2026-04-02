import {
  ConfidentialClientApplication,
  type Configuration,
  type AuthenticationResult,
} from "@azure/msal-node";
import axios, { AxiosError, type AxiosInstance } from "axios";
import { DATAVERSE_API_VERSION, REQUEST_TIMEOUT_MS } from "../constants.js";
import type { ODataCollectionResponse } from "../types.js";

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable "${name}" is not set.`);
  }
  return value;
}

export class DataverseClient {
  private readonly baseUrl: string;
  private readonly apiBase: string;
  private readonly msalApp: ConfidentialClientApplication;
  private readonly scope: string;
  private readonly http: AxiosInstance;

  constructor() {
    const dataverseUrl = getRequiredEnv("DATAVERSE_URL").replace(/\/$/, "");
    const tenantId = getRequiredEnv("AZURE_TENANT_ID");
    const clientId = getRequiredEnv("AZURE_CLIENT_ID");
    const clientSecret = getRequiredEnv("AZURE_CLIENT_SECRET");

    this.baseUrl = dataverseUrl;
    this.apiBase = `${dataverseUrl}/api/data/v${DATAVERSE_API_VERSION}`;
    this.scope = `${dataverseUrl}/.default`;

    const msalConfig: Configuration = {
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    };
    this.msalApp = new ConfidentialClientApplication(msalConfig);

    this.http = axios.create({
      baseURL: this.apiBase,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const result: AuthenticationResult | null =
      await this.msalApp.acquireTokenByClientCredential({
        scopes: [this.scope],
      });

    if (!result?.accessToken) {
      throw new Error("Failed to acquire access token from Microsoft Entra ID.");
    }
    return result.accessToken;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();

    const response = await this.http.get<T>(path, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    });

    return response.data;
  }

  async getCollection<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<ODataCollectionResponse<T>> {
    return this.get<ODataCollectionResponse<T>>(path, params);
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const message =
        (error.response.data as { error?: { message?: string } })?.error
          ?.message ?? error.message;

      switch (status) {
        case 400:
          return `Error 400 Bad Request: ${message}. Check your filter or query syntax.`;
        case 401:
          return "Error 401 Unauthorized: Authentication failed. Check AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID.";
        case 403:
          return "Error 403 Forbidden: The application user lacks required Dataverse security role privileges.";
        case 404:
          return `Error 404 Not Found: ${message}. Check entity_set_name or entity_name.`;
        case 429:
          return "Error 429 Too Many Requests: Dataverse API rate limit exceeded. Retry after a short delay.";
        default:
          return `Error ${status}: ${message}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return `Error: Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Try a more specific query or smaller $top value.`;
    } else if (error.code === "ENOTFOUND") {
      return `Error: Cannot reach Dataverse at "${process.env["DATAVERSE_URL"]}". Check DATAVERSE_URL and network connectivity.`;
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
