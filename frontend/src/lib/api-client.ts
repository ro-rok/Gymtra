const resolveDefaultBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const host = window.location.hostname || "localhost";
  return `${protocol}//${host}:8000`;
};

const DEFAULT_BASE_URL = resolveDefaultBaseUrl();

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const normalizeBaseUrl = (value?: string) => {
  const base = value?.trim() || DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (!isRecord(payload)) return fallback;
  const message = payload.message;
  const detail = payload.detail;
  if (typeof message === "string" && message.trim()) return message;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
};

const toQueryString = (query?: Record<string, string | number | boolean | undefined>) => {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
};

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  tenantSlug?: string;
  skipAuthHandling?: boolean;
  _retriedAfterRefresh?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;
let onAuthFailure: (() => void | Promise<void>) | null = null;

const REFRESH_PATH = "/api/v1/auth/refresh";

export const setAuthFailureHandler = (handler: (() => void | Promise<void>) | null) => {
  onAuthFailure = handler;
};

const shouldHandle401 = (path: string, options: RequestOptions) =>
  !options.skipAuthHandling && !options._retriedAfterRefresh && path !== REFRESH_PATH;

const attemptRefresh = async () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = "GET", body, headers, query, signal, tenantSlug } = options;
  const url = `${API_BASE_URL}${path}${toQueryString(query)}`;

  const response = await fetch(url, {
    method,
    credentials: "include",
    signal,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (response.status === 401 && shouldHandle401(path, options)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retriedAfterRefresh: true });
    }
    if (onAuthFailure) {
      await onAuthFailure();
    }
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, "Request failed"), response.status, payload);
  }

  return payload as T;
};

export const apiGet = <T>(
  path: string,
  options?: Omit<RequestOptions, "method" | "body">,
) => apiRequest<T>(path, { ...options, method: "GET" });

export const apiPost = <T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
) => apiRequest<T>(path, { ...options, method: "POST", body });

export const apiPatch = <T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
) => apiRequest<T>(path, { ...options, method: "PATCH", body });
