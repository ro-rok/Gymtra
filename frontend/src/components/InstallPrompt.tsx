import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/tracking";

const DISMISS_KEY = "gymtra_install_prompt_dismissed";

const shouldShowInstallPrompt = () => {
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;
  const visits = Number(localStorage.getItem("gymtra_dashboard_visits") || 0);
  const checkins = Number(localStorage.getItem("gymtra_checkin_success_count") || 0);
  const onboardingDone = localStorage.getItem("gymtra_onboarding_completed") === "1";
  return visits >= 2 || checkins >= 1 || onboardingDone;
};

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      if (shouldShowInstallPrompt()) setVisible(true);
    };
    const onInstalled = () => {
      track("pwa_installed");
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred?.prompt) return;
    await deferred.prompt();
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:bottom-20 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-primary/30 bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Gymtra</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for a faster, app-like experience.</p>
          <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={install} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Install
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </div>
        <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

