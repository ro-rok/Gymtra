import { apiGet, apiPost } from "@/lib/api-client";
import type { ReminderType } from "@/lib/types";

export interface ReminderQueueItem {
  memberId: string;
  gymId: string;
  memberName: string;
  phone: string;
  type: ReminderType;
  message: string;
  waUrl: string;
}

export interface ReminderLogItem {
  id: string;
  gymId: string;
  userId: string;
  eventType: string;
  status: string;
  channel?: string;
  message?: string;
  createdAt: string;
}

export const listReminderQueueRequest = () =>
  apiGet<{ items: ReminderQueueItem[] }>("/api/v1/reminders/queue");

export const listReminderLogsRequest = () =>
  apiGet<{ items: ReminderLogItem[] }>("/api/v1/reminders/logs");

export const sendReminderRequest = (payload: {
  memberId: string;
  type: ReminderType;
  message: string;
  channel: "whatsapp" | "push" | "browser";
}) =>
  apiPost("/api/v1/reminders/send", {
    ...payload,
    channel: payload.channel === "browser" ? "push" : payload.channel,
  });
