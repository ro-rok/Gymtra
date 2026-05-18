import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, ExternalLink, Smartphone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { PushNotAvailableError } from "@/lib/push-api";
import { setNotificationDontAskAgain } from "@/lib/notification-prompt-storage";
import { getPushPlatformHint, iosWebPushRequiresInstall } from "@/lib/push-platform";
import { canSubscribeToPush, getPushPermission, getPushUnavailableReason, isPushSupported } from "@/lib/push-support";

type ProfileNotificationSettingsProps = {
  showReminderLink?: boolean;
};

export const ProfileNotificationSettings = ({ showReminderLink = false }: ProfileNotificationSettingsProps) => {
  const { gymSlug } = useParams();
  const { toast } = useToast();
  const { registerPushSubscription } = usePushRegistration();
  const [permission, setPermission] = useState(getPushPermission);
  const [busy, setBusy] = useState(false);
  const iosInstallRequired = iosWebPushRequiresInstall();
  const platformHint = getPushPlatformHint();

  const sync = useCallback(() => setPermission(getPushPermission()), []);

  useEffect(() => {
    sync();
  }, [sync]);

  const enable = async () => {
    if (!isPushSupported()) {
      toast({
        title: "Not supported",
        description: getPushUnavailableReason() || "This browser does not support push notifications.",
        variant: "destructive",
      });
      return;
    }
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
      if (ok) {
        toast({ title: "Notifications enabled", description: "This device will receive Gymtra alerts." });
        return;
      }
      if (next === "denied") {
        setNotificationDontAskAgain(true);
        toast({
          title: "Notifications blocked",
          description: "Allow notifications in your browser site settings, then try again here.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Could not enable",
          description: "Allow the browser prompt when it appears.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Could not enable",
        description: err instanceof PushNotAvailableError ? err.message : "Try again from an installed app or Chrome.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (!isPushSupported()) {
    return (
      <p className="text-sm text-muted-foreground">
        {getPushUnavailableReason() ||
          "Push notifications are not available in this browser. Try Chrome on Android or install the app on iPhone."}
      </p>
    );
  }

  if (iosInstallRequired && platformHint) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3">
          <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Install Gymtra on your iPhone</p>
            <p className="text-xs text-muted-foreground mt-1">{platformHint}</p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Notifications are on</p>
            <p className="text-xs text-muted-foreground mt-0.5">This device can receive reminders and alerts.</p>
          </div>
        </div>
        {showReminderLink && gymSlug ? (
          <Link to={`/${gymSlug}/member/settings`}>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              Reminder preferences <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
          <BellOff className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {permission === "denied" ? "Notifications are blocked" : "Notifications are off"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {permission === "denied"
              ? "Allow notifications in your browser settings for this site, then tap the button below."
              : "Enable alerts for check-ins, reminders, and gym updates on this device."}
          </p>
          {platformHint ? <p className="text-xs text-muted-foreground mt-2">{platformHint}</p> : null}
        </div>
      </div>
      <Button onClick={enable} disabled={busy} className="gap-2">
        <Bell className="w-4 h-4" />
        {busy ? "Enabling..." : "Enable notifications"}
      </Button>
      {showReminderLink && gymSlug ? (
        <p className="text-xs text-muted-foreground">
          After enabling, customize water and diet reminders in{" "}
          <Link to={`/${gymSlug}/member/settings`} className="text-primary underline-offset-2 hover:underline">
            reminder settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
};
