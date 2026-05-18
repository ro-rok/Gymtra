import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { normalizeNotificationPath } from "@/lib/notification-routes";
import { track } from "@/lib/tracking";

export const useNotificationHandler = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { registerPushSubscription } = usePushRegistration();

  const navigateToNotificationPath = useCallback(
    (path: string) => {
      const hashIndex = path.indexOf("#");
      const pathname = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
      const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
      const searchIndex = pathname.indexOf("?");
      if (searchIndex >= 0) {
        navigate({
          pathname: pathname.slice(0, searchIndex),
          search: pathname.slice(searchIndex),
          hash,
        });
      } else {
        navigate({ pathname, hash });
      }
    },
    [navigate],
  );

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
          const path = normalizeNotificationPath(data.url, user?.gymSlug);
          track("notification_clicked", { eventType: data.eventType, url: path });
          navigateToNotificationPath(path);
        }
      }
      if (data.type === "NOTIFICATION_CLOSED") {
        track("reminder_dismissed", { eventType: data.eventType, tag: data.tag });
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigateToNotificationPath, registerPushSubscription, user?.gymSlug]);
};
