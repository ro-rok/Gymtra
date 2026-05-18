export type PushPlatform = "ios" | "android" | "desktop" | "unknown";

const isBrowser = () => typeof window !== "undefined";

export const getPushPlatform = (): PushPlatform => {
  if (!isBrowser()) return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "unknown";
};

/** Installed PWA (home screen) — required for Web Push on iOS 16.4+. */
export const isStandalonePwa = (): boolean => {
  if (!isBrowser()) return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const iosWebPushRequiresInstall = (): boolean =>
  getPushPlatform() === "ios" && !isStandalonePwa();

export const getPushPlatformHint = (): string | null => {
  if (iosWebPushRequiresInstall()) {
    return "On iPhone, add Gymtra to your Home Screen (Share → Add to Home Screen), open it from there, then enable notifications.";
  }
  if (getPushPlatform() === "android") {
    return "Works in Chrome when notifications are allowed. Keep the app installed for best delivery.";
  }
  return null;
};
