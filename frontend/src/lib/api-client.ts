import { handleDemoRequest, isDemoPath } from "@/lib/demo-adapter";
import { getStoredRefreshToken, setStoredRefreshToken } from "@/lib/auth-storage";

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
  const trimmed = value?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const buildApiUrl = (path: string) => {
  const pathWithQuery = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return pathWithQuery;
  return `${API_BASE_URL}${pathWithQuery}`;
};

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

interface RefreshResponse {
  user?: unknown;
  refreshToken?: string;
}

const postRefresh = async (refreshToken?: string | null) => {
  const body = refreshToken ? { refreshToken } : undefined;
  const response = await fetch(buildApiUrl(REFRESH_PATH), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) return false;
  const payload = (await response.json().catch(() => null)) as RefreshResponse | null;
  if (payload?.refreshToken) {
    setStoredRefreshToken(payload.refreshToken);
  }
  return true;
};

const attemptRefresh = async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const cookieOk = await postRefresh();
      if (cookieOk) return true;
      const stored = getStoredRefreshToken();
      if (!stored) return false;
      return postRefresh(stored);
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const refreshSession = () => attemptRefresh();

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = "GET", body, headers, query, signal, tenantSlug } = options;
  const pathWithQuery = `${path}${toQueryString(query)}`;
  if (isDemoPath()) {
    return handleDemoRequest<T>(pathWithQuery, method, body);
  }
  const url = buildApiUrl(pathWithQuery);

  const response = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
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
