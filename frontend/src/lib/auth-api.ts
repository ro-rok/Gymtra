import type { AuthUser } from "@/lib/types";
import { apiGet, apiPost } from "@/lib/api-client";
import { setStoredRefreshToken } from "@/lib/auth-storage";

interface LoginResponse {
  user: AuthUser;
  refreshToken?: string | null;
}

const persistRefreshFromResponse = (response: LoginResponse) => {
  if (response.refreshToken) {
    setStoredRefreshToken(response.refreshToken);
  }
};

export const loginRequest = (payload: { email: string; password: string; gymSlug?: string }) =>
  apiPost<LoginResponse>("/api/v1/auth/login", payload, { skipAuthHandling: true }).then((res) => {
    persistRefreshFromResponse(res);
    return res;
  });

export const loginPhoneRequest = (payload: { phone: string; password: string; gymSlug?: string }) =>
  apiPost<LoginResponse>("/api/v1/auth/login-phone", payload, { skipAuthHandling: true }).then((res) => {
    persistRefreshFromResponse(res);
    return res;
  });

export const refreshSessionRequest = () =>
  apiPost<LoginResponse>("/api/v1/auth/refresh", undefined, { skipAuthHandling: true }).then((res) => {
    persistRefreshFromResponse(res);
    return res;
  });

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

export const ownerForgotPasswordRequest = (payload: { gymSlug: string; email: string }) =>
  apiPost("/api/v1/auth/owner-forgot-password", payload, { skipAuthHandling: true });

export interface OwnerPasswordResetRequestItem {
  id: string;
  gymId: string;
  gymSlug: string;
  gymName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  createdAt: string;
}

export const listPendingOwnerPasswordResetRequests = () =>
  apiGet<{ items: OwnerPasswordResetRequestItem[]; total: number }>("/api/v1/auth/owner-password-reset-requests/pending");

export const approveOwnerPasswordResetRequest = (requestId: string) =>
  apiPost<{ success: boolean; ownerEmail: string; temporaryPassword: string }>(`/api/v1/auth/owner-password-reset-requests/${requestId}/approve`);

export const listPendingPasswordResetRequests = () =>
  apiGet<{ items: PasswordResetRequestItem[]; total: number }>("/api/v1/auth/password-reset-requests/pending");

export const approvePasswordResetRequest = (requestId: string) =>
  apiPost(`/api/v1/auth/password-reset-requests/${requestId}/approve`);
