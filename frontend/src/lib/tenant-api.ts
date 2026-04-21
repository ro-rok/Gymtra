import type { Gym } from "@/lib/types";
import { apiGet } from "@/lib/api-client";

export const fetchPublicGyms = () => apiGet<Gym[]>("/api/v1/public/gyms");

export const fetchGymBySlug = (slug: string) => apiGet<Gym>(`/api/v1/public/gyms/${encodeURIComponent(slug)}`);
