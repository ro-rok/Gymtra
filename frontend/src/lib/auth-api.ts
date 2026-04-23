import type { AuthUser } from "@/lib/types";
import { apiGet, apiPost } from "@/lib/api-client";

interface LoginResponse {
  user: AuthUser;
}

export const loginRequest = (payload: { email: string; password: string; gymSlug?: string }) =>
  apiPost<LoginResponse>("/api/v1/auth/login", payload);

export const loginPhoneRequest = (payload: { phone: string; password: string; gymSlug?: string }) =>
  apiPost<LoginResponse>("/api/v1/auth/login-phone", payload);

export const meRequest = () => apiGet<AuthUser>("/api/v1/auth/me");

export const logoutRequest = () => apiPost<unknown>("/api/v1/auth/logout", undefined, { skipAuthHandling: true });

export const changePasswordRequiredRequest = (payload: { newPassword: string }) =>
  apiPost("/api/v1/auth/change-password-required", payload);

export interface PasswordResetRequestItem {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  createdAt: string;
  status: string;
}

export const createPasswordResetRequest = (payload: { gymSlug: string; identifier: string }) =>
  apiPost("/api/v1/auth/password-reset-request", payload);

export const listPendingPasswordResetRequests = () =>
  apiGet<{ items: PasswordResetRequestItem[]; total: number }>("/api/v1/auth/password-reset-requests/pending");

export const approvePasswordResetRequest = (requestId: string) =>
  apiPost(`/api/v1/auth/password-reset-requests/${requestId}/approve`);
