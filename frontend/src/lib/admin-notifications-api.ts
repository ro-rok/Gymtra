import { apiPost } from "@/lib/api-client";

export type TestBroadcastTemplate = "generic" | "water";

export const sendTestBroadcastRequest = (template: TestBroadcastTemplate = "generic") =>
  apiPost<{ queued: number; activeSubscriptions: number }>("/api/v1/admin/notifications/test-broadcast", {
    template,
  });
