import { apiPost, apiRequest } from "@/lib/api-client";

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export const savePushSubscription = (payload: WebPushSubscriptionPayload) =>
  apiPost("/api/v1/notifications/push-subscriptions", payload);

export const removePushSubscription = (endpoint: string) =>
  apiRequest("/api/v1/notifications/push-subscriptions", {
    method: "DELETE",
    body: { endpoint },
    skipAuthHandling: true,
  });

export const triggerPushNotification = (payload: {
  eventType: string;
  title: string;
  body: string;
  userId?: string;
}) => apiPost("/api/v1/notifications/trigger", payload);

export const unregisterPushSubscription = async () => {
  if (!("serviceWorker" in navigator)) return;
  const sw = await navigator.serviceWorker.ready;
  const subscription = await sw.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await removePushSubscription(endpoint);
  } catch {
    // Ignore API failures and still attempt local unsubscribe.
  }
  await subscription.unsubscribe().catch(() => undefined);
};

