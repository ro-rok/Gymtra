import type { Gym } from "@/lib/types";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export const fetchPublicGyms = () => apiGet<Gym[]>("/api/v1/public/gyms");

export const fetchGymBySlug = (slug: string) => apiGet<Gym>(`/api/v1/public/gyms/${encodeURIComponent(slug)}`);

export const signTenantLogoUploadRequest = (slug: string, payload: { fileName: string; contentType: string }) =>
  apiPost<{
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    publicId: string;
    signature: string;
  }>(`/api/v1/tenants/${encodeURIComponent(slug)}/branding/logo/sign`, payload);

export const updateTenantLogoRequest = (slug: string, logoUrl: string) =>
  apiPatch<{ gymId: string; slug: string; name: string; logo: string | null; tagline?: string; brandColor?: string }>(
    `/api/v1/tenants/${encodeURIComponent(slug)}/branding/logo`,
    { logoUrl },
  );

export const updateTenantPricingRequest = (
  slug: string,
  payload: { monthly: number; quarterly: number; halfYearly: number },
) =>
  apiPatch<{ gymId: string; slug: string; planPricing: { monthly: number; quarterly: number; halfYearly: number } }>(
    `/api/v1/tenants/${encodeURIComponent(slug)}/pricing`,
    payload,
  );
