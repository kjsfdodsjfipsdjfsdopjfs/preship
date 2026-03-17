import fetch from "node-fetch";
import Conf from "conf";

const API_BASE_URL = process.env.PRESHIP_API_URL || "https://api.preship.dev";

export class ApiClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
  }
}

interface CliConfig {
  apiKey: string;
  apiUrl: string;
  format: string;
  failUnder: number;
}

export function getConfig(): Conf<CliConfig> {
  return new Conf<CliConfig>({
    projectName: "preship",
    schema: {
      apiKey: { type: "string", default: "" },
      apiUrl: { type: "string", default: API_BASE_URL },
      format: { type: "string", default: "summary" },
      failUnder: { type: "number", default: 0 },
    },
  });
}

async function apiRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey: string;
  }
): Promise<unknown> {
  const config = getConfig();
  const baseUrl = (config.get("apiUrl") as string) || API_BASE_URL;

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": options.apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || text;
    } catch {
      // keep original text
    }
    throw new ApiClientError(message, response.status);
  }

  return response.json();
}

export interface CreateScanResponse {
  id: string;
  status: string;
}

export async function createScan(
  data: {
    url: string;
    options?: {
      maxPages?: number;
      categories?: string[];
      includeFixSuggestions?: boolean;
    };
  },
  apiKey: string
): Promise<CreateScanResponse> {
  return apiRequest("/v1/scans", {
    method: "POST",
    body: data,
    apiKey,
  }) as Promise<CreateScanResponse>;
}

export interface PollResult {
  id: string;
  status: string;
  overallScore?: number;
  categories?: unknown[];
  violations?: unknown[];
  suggestions?: unknown[];
  pagesScanned?: number;
  createdAt?: string;
  completedAt?: string;
  reportUrl?: string;
}

export async function pollScanUntilComplete(
  scanId: string,
  options: {
    apiKey: string;
    pollInterval?: number;
    timeout?: number;
    onPoll?: (result: PollResult) => void;
  }
): Promise<PollResult> {
  const pollInterval = options.pollInterval || 2000;
  const timeout = options.timeout || 300000;
  const startTime = Date.now();

  while (true) {
    const result = (await apiRequest(`/v1/scans/${scanId}`, {
      apiKey: options.apiKey,
    })) as PollResult;

    if (options.onPoll) {
      options.onPoll(result);
    }

    if (result.status === "completed" || result.status === "failed") {
      return result;
    }

    if (Date.now() - startTime > timeout) {
      throw new Error("Scan timed out. It may still be running on the server.");
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
