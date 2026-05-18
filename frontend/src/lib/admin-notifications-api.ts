import { apiPost } from "@/lib/api-client";

export const sendTestBroadcastRequest = () =>
  apiPost<{ queued: number; activeSubscriptions: number }>("/api/v1/admin/notifications/test-broadcast", {});
