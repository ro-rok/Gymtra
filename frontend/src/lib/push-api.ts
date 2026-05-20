import { apiGet, apiPost, apiRequest } from "@/lib/api-client";
import { iosWebPushRequiresInstall } from "@/lib/push-platform";
import { waitForServiceWorkerRegistration } from "@/lib/pwa";

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export class PushNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushNotAvailableError";
  }
}

export const getVapidPublicKey = () =>
  apiGet<{ publicKey: string }>("/api/v1/notifications/vapid-public-key");

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return null;
  }
  if (iosWebPushRequiresInstall()) {
    throw new PushNotAvailableError(
      "On iPhone, add Gymtra to your Home Screen, open it from there, then enable notifications.",
    );
  }

  await waitForServiceWorkerRegistration();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const { publicKey } = await getVapidPublicKey();
  if (!publicKey?.trim()) {
    throw new Error("Push is not configured on the server (missing VAPID public key).");
  }

  const sw = await navigator.serviceWorker.ready;
  const existing = await sw.pushManager.getSubscription();
  if (existing) return existing;

  return sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
};

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

export const hasPushSubscription = async (): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const sw = await navigator.serviceWorker.ready;
    const subscription = await sw.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
};

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
