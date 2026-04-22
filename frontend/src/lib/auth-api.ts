import type { AuthUser } from "@/lib/types";
import { apiGet, apiPost } from "@/lib/api-client";

interface LoginResponse {
  user: AuthUser;
}

export const loginRequest = (payload: { email: string; password: string; gymSlug?: string }) =>
  apiPost<LoginResponse>("/api/v1/auth/login", payload);

export const meRequest = () => apiGet<AuthUser>("/api/v1/auth/me");

export const logoutRequest = () => apiPost<unknown>("/api/v1/auth/logout", undefined, { skipAuthHandling: true });
