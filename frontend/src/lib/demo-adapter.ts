import { ApiError } from "@/lib/api-client";
import { getDemoState, initDemoState, updateDemoState } from "@/lib/demo-store";

const getQueryDate = (url: string) => {
  const idx = url.indexOf("?");
  if (idx < 0) return "";
  const params = new URLSearchParams(url.slice(idx + 1));
  return params.get("date") || "";
};

const getSlugFromPath = () => {
  const parts = window.location.pathname.split("/");
  return parts[2] || "star-fitness";
};

const ensure = () => {
  const slug = getSlugFromPath();
  return initDemoState(slug);
};

export const isDemoPath = () => typeof window !== "undefined" && window.location.pathname.startsWith("/demo/");

export const handleDemoRequest = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
  const state = ensure();

  if (method === "GET" && path.startsWith("/api/v1/member-profiles/members")) {
    return { items: state.members, total: state.members.length } as T;
  }
  if (method === "GET" && path === "/api/v1/memberships") {
    return { items: state.memberships } as T;
  }
  if (method === "GET" && path.startsWith("/api/v1/member-profiles/dashboard/summary")) {
    const active = state.members.filter((m) => m.status === "active").length;
    const expired = state.members.filter((m) => m.status === "expired").length;
    const pendingRenewal = state.members.filter((m) => m.status === "pending_renewal").length;
    return {
      total: state.members.length,
      active,
      expired,
      pendingRenewal,
      expiringSoon: pendingRenewal,
      unpaid: expired + pendingRenewal,
    } as T;
  }
  if (method === "GET" && path.startsWith("/api/v1/attendance/day")) {
    const requested = getQueryDate(path);
    const items = state.attendance.filter((item) => item.date === requested);
    return { date: requested, items } as T;
  }
  if (method === "GET" && path === "/api/v1/expenses") {
    return state.expenses as T;
  }

  if (method === "POST" && path === "/api/v1/attendance/mark") {
    const payload = (body || {}) as { memberId?: string; date?: string; status?: "present" | "skipped" };
    if (!payload.memberId || !payload.date || !payload.status) {
      throw new ApiError("Invalid attendance payload", 400);
    }
    const row = {
      id: `att-manual-${Date.now()}`,
      memberId: payload.memberId,
      gymId: state.gym.id,
      date: payload.date,
      status: payload.status,
      markedBy: "owner-demo",
      source: "manual" as const,
      trustLevel: "high" as const,
    };
    updateDemoState((current) => ({ ...current, attendance: [row, ...current.attendance] }));
    return row as T;
  }

  if (method === "POST" && path === "/api/v1/member-profiles/members") {
    const payload = (body || {}) as { name?: string; phone?: string; email?: string; joinDate?: string };
    if (!payload.name || !payload.phone) throw new ApiError("Name and phone are required", 400);
    const current = getDemoState();
    if (!current) throw new ApiError("Demo state unavailable", 500);
    const member = {
      id: `demo-member-${Date.now()}`,
      gymId: current.gym.id,
      name: payload.name,
      email: payload.email || `${payload.name.toLowerCase().replace(/\s+/g, ".")}@demo.local`,
      phone: payload.phone,
      joinDate: payload.joinDate || new Date().toISOString().slice(0, 10),
      status: "active" as const,
      avatar: payload.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    };
    updateDemoState((next) => ({ ...next, members: [member, ...next.members] }));
    return member as T;
  }

  throw new ApiError(`Demo adapter does not support ${method} ${path}`, 501);
};

