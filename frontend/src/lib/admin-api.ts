import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Gym } from "@/lib/types";

type AdminGym = {
  id: string;
  slug: string;
  name: string;
  city: string;
  tagline?: string;
  logo?: string;
  members?: number;
  isActive: boolean;
  seatCount: number;
  ownerUserId?: string;
  adminUserId?: string;
  createdAt: string;
  brandColor?: string;
  metaTitle?: string;
  metaDescription?: string;
};

const toGym = (g: AdminGym): Gym => ({
  id: g.id,
  slug: g.slug,
  name: g.name,
  city: g.city,
  tagline: g.tagline || "",
  logo: g.logo || "🏋️",
  members: g.members || 0,
  isActive: g.isActive,
  seatCount: g.seatCount,
  ownerId: g.ownerUserId,
  adminUserId: g.adminUserId,
  createdAt: g.createdAt,
  brandColor: g.brandColor,
  metaTitle: g.metaTitle,
  metaDescription: g.metaDescription,
});

export const listAdminGymsRequest = async () => {
  const data = await apiGet<AdminGym[]>("/api/v1/admin/gyms");
  return data.map(toGym);
};

export const createAdminGymRequest = async (payload: {
  name: string;
  slug: string;
  city: string;
  tagline?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerPassword: string;
}) => {
  const row = await apiPost<AdminGym>("/api/v1/admin/gyms", payload);
  return toGym(row);
};

export const updateAdminGymRequest = async (gymId: string, payload: Partial<{
  name: string;
  city: string;
  tagline: string;
  logo: string;
  seatCount: number;
  ownerUserId: string | null;
  adminUserId: string | null;
  isActive: boolean;
  brandColor: string;
  metaTitle: string;
  metaDescription: string;
}>) => {
  const row = await apiPatch<AdminGym>(`/api/v1/admin/gyms/${gymId}`, payload);
  return toGym(row);
};

export const updateAdminGymStatusRequest = async (gymId: string, isActive: boolean) => {
  const row = await apiPatch<AdminGym>(`/api/v1/admin/gyms/${gymId}/status`, { isActive });
  return toGym(row);
};

export type KeepaliveStatus = {
  enabled: boolean;
  lastPingAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  pingCount: number;
  intervalSeconds: number;
  isHealthy: boolean;
  secondsSinceLastPing: number | null;
  nextPingInSeconds: number | null;
};

export const getKeepaliveStatusRequest = () =>
  apiGet<KeepaliveStatus>("/api/v1/admin/system/keepalive");
