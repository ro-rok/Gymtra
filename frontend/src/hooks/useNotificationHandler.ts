import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { usePushRegistration } from "@/hooks/usePushRegistration";
import { track } from "@/lib/tracking";

const resolveNotificationPath = (url: string): string => {
  if (!url || url.startsWith("http")) {
    try {
      return url ? new URL(url).pathname + new URL(url).search : "/";
    } catch {
      return "/";
    }
  }
  const segments = window.location.pathname.split("/").filter(Boolean);
  const gymSlug = segments[0];
  if (gymSlug && (url.startsWith("/member") || url.startsWith("/owner")) && !url.startsWith(`/${gymSlug}/`)) {
    return `/${gymSlug}${url}`;
  }
  return url;
};

export const useNotificationHandler = () => {
  const navigate = useNavigate();
  const { registerPushSubscription } = usePushRegistration();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};

      if (data.type === "PUSH_SUBSCRIPTION_CHANGED") {
        registerPushSubscription(true).catch(() => undefined);
        return;
      }

      if (data.type === "NOTIFICATION_CLICKED" || data.type === "PUSH_RECEIVED") {
        if (data.url) {
          const path = resolveNotificationPath(data.url);
          track("notification_clicked", { eventType: data.eventType, url: path });
          navigate(path);
        }
      }
      if (data.type === "NOTIFICATION_CLOSED") {
        track("reminder_dismissed", { eventType: data.eventType, tag: data.tag });
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate, registerPushSubscription]);
};
