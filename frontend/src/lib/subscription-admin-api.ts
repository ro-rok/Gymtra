import { apiGet, apiPatch } from "@/lib/api-client";
import type { Subscription } from "@/lib/types";

type AdminSubscription = {
  id: string;
  gymId: string;
  plan: string;
  seats: number;
  usedSeats: number;
  status: "active" | "expired" | "trial";
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  extraSeatPrice: number;
};

export const listAdminSubscriptionsRequest = () =>
  apiGet<AdminSubscription[]>("/api/v1/admin/subscriptions");

export const updateAdminSubscriptionRequest = (gymId: string, payload: Partial<{
  plan: string;
  seatCount: number;
  usedSeats: number;
  baseAmount: number;
  extraStaffPrice: number;
  status: "active" | "expired" | "trial";
  periodStart: string;
  periodEnd: string;
}>) => apiPatch<AdminSubscription>(`/api/v1/admin/subscriptions/gyms/${gymId}`, payload);

export const toSubscription = (s: AdminSubscription): Subscription => ({
  id: s.id,
  gymId: s.gymId,
  plan: s.plan,
  seats: s.seats,
  usedSeats: s.usedSeats,
  status: s.status,
  startDate: s.startDate,
  endDate: s.endDate,
  monthlyAmount: s.monthlyAmount,
  extraSeatPrice: s.extraSeatPrice,
});
