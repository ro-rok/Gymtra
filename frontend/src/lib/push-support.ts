import { getPushPlatformHint, iosWebPushRequiresInstall } from "@/lib/push-platform";

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const canSubscribeToPush = () => isPushSupported() && !iosWebPushRequiresInstall();

export const getPushPermission = (): NotificationPermission | "unsupported" => {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
};

export const getPushUnavailableReason = (): string | null => {
  if (!isPushSupported()) {
    return "This browser does not support Web Push. Use Chrome on Android or install Gymtra on iPhone (iOS 16.4+).";
  }
  return getPushPlatformHint();
};
