export type StoredMessage = {
  role: string;
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string;
  messages?: StoredMessage[];
};

export type PersonaSummary = {
  configured: boolean;
  source: string;
  selectedPerson: string;
  name: string;
  role: string;
  summary: string;
  sourcePath: string;
};

export type BootstrapResponse = {
  userId: string;
  requiresSetup: boolean;
  persona: PersonaSummary;
};

export type Participant = {
  name: string;
  messageCount: number;
  preview: string;
};

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return "";
  }

  if (
    import.meta.env.DEV &&
    /https?:\/\/(localhost|127\.0\.0\.1):5000\/?$/i.test(configuredBaseUrl)
  ) {
    return "";
  }

  return configuredBaseUrl.replace(/\/$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();
const DEV_FALLBACK_API_BASE_URL = "http://localhost:5000";

function joinApiUrl(baseUrl: string, apiPath: string) {
  return `${baseUrl}${apiPath}`;
}

function getApiCandidates(apiPath: string) {
  const primaryBaseUrl = API_BASE_URL || "";
  const candidates = [joinApiUrl(primaryBaseUrl, apiPath)];

  if (
    import.meta.env.DEV &&
    !API_BASE_URL &&
    !candidates.includes(joinApiUrl(DEV_FALLBACK_API_BASE_URL, apiPath))
  ) {
    candidates.push(joinApiUrl(DEV_FALLBACK_API_BASE_URL, apiPath));
  }

  return candidates;
}

export async function fetchApi(apiPath: string, init?: RequestInit) {
  let lastError: Error | null = null;

  for (const url of getApiCandidates(apiPath)) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        ...init
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.toLowerCase().includes("application/json")) {
        lastError = new Error(`API at ${url} returned ${contentType || "a non-JSON response"}.`);
        continue;
      }

      const data = await response.json();
      return { response, data, url };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");
    }
  }

  throw lastError ?? new Error("Unable to reach the API.");
}
