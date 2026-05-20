import { useCallback } from "react";

import { PushNotAvailableError, savePushSubscription, subscribeToPush } from "@/lib/push-api";
import { canSubscribeToPush, getPushUnavailableReason } from "@/lib/push-support";
import { track } from "@/lib/tracking";
import { waitForServiceWorkerRegistration } from "@/lib/pwa";

export const usePushRegistration = () => {
  const register = useCallback(async (requestPermission = false) => {
    if (!canSubscribeToPush() && requestPermission) {
      throw new PushNotAvailableError(getPushUnavailableReason() || "Push is not available on this device.");
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    await waitForServiceWorkerRegistration();
    const sw = await navigator.serviceWorker.ready;
    let subscription = await sw.pushManager.getSubscription();

    const maySubscribe =
      requestPermission || (typeof Notification !== "undefined" && Notification.permission === "granted");
    if (!subscription && maySubscribe) {
      subscription = await subscribeToPush();
    }
    if (!subscription) return false;

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    await savePushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    });
    track("notification_sent", { scope: "push_subscribe" });
    return true;
  }, []);

  return { registerPushSubscription: register };
};
