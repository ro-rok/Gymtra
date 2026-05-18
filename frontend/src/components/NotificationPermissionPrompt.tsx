import { useCallback, useEffect, useState } from "react";
import { Bell, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import {
  getNotificationDontAskAgain,
  setNotificationDontAskAgain,
} from "@/lib/notification-prompt-storage";
import { PushNotAvailableError } from "@/lib/push-api";
import { getPushPlatformHint, iosWebPushRequiresInstall } from "@/lib/push-platform";
import { canSubscribeToPush, getPushPermission, isPushSupported } from "@/lib/push-support";

const PUSH_ROLES = new Set(["member", "owner", "super_admin"]);

export const NotificationPermissionPrompt = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { registerPushSubscription } = usePushRegistration();
  const [permission, setPermission] = useState(getPushPermission);
  const [dontAskAgain, setDontAskAgain] = useState(getNotificationDontAskAgain);
  const [busy, setBusy] = useState(false);
  const iosInstallRequired = iosWebPushRequiresInstall();
  const platformHint = getPushPlatformHint();

  const syncPermission = useCallback(() => {
    setPermission(getPushPermission());
    setDontAskAgain(getNotificationDontAskAgain());
  }, []);

  useEffect(() => {
    syncPermission();
  }, [user, syncPermission]);

  useEffect(() => {
    const onFocus = () => syncPermission();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [syncPermission]);

  useEffect(() => {
    if (permission !== "granted" || !user || !canSubscribeToPush()) return;
    setNotificationDontAskAgain(false);
    registerPushSubscription(false).catch(() => undefined);
  }, [permission, user, registerPushSubscription]);

  const enableNotifications = async () => {
    if (!canSubscribeToPush()) {
      toast({
        title: "Install the app first",
        description: platformHint || "Add Gymtra to your home screen, then enable notifications.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      setNotificationDontAskAgain(false);
      const ok = await registerPushSubscription(true);
      const next = getPushPermission();
      setPermission(next);
      setDontAskAgain(getNotificationDontAskAgain());
      if (ok) {
        toast({
          title: "Notifications enabled",
          description: "This device can now receive Gymtra alerts.",
        });
        return;
      }
      if (next === "denied") {
        setNotificationDontAskAgain(true);
        setDontAskAgain(true);
        toast({
          title: "Notifications blocked",
          description: "You can enable them later from your profile.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Could not enable",
        description: err instanceof PushNotAvailableError ? err.message : "Try again from Chrome or the installed app.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDontAskAgain = () => {
    setNotificationDontAskAgain(true);
    setDontAskAgain(true);
  };

  if (loading || !user || !PUSH_ROLES.has(user.role) || !isPushSupported()) {
    return null;
  }

  if (permission === "granted" || dontAskAgain || permission === "denied") {
    return null;
  }

  if (permission !== "default") {
    return null;
  }

  if (iosInstallRequired && platformHint) {
    return (
      <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-amber-500/40 bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install Gymtra for notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">{platformHint}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-primary/30 bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Enable notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stay on track with reminders and gym updates. Works via your browser&apos;s background service worker.
          </p>
          {platformHint ? <p className="text-xs text-muted-foreground mt-1">{platformHint}</p> : null}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" onClick={enableNotifications} disabled={busy}>
              {busy ? "Waiting..." : "Allow notifications"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDontAskAgain} disabled={busy}>
              Don&apos;t ask again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
