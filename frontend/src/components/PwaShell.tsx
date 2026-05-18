import { InstallPrompt } from "@/components/InstallPrompt";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { OnlineReconnectBanner } from "@/components/OnlineReconnectBanner";
import { SwUpdateBanner } from "@/components/SwUpdateBanner";
import { useNotificationHandler } from "@/hooks/useNotificationHandler";

export const PwaShell = () => {
  useNotificationHandler();
  return (
    <>
      <NotificationPermissionPrompt />
      <OnlineReconnectBanner />
      <SwUpdateBanner />
      <InstallPrompt />
    </>
  );
};
