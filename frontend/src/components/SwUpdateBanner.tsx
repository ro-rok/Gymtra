import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { setServiceWorkerUpdateHandler, type ServiceWorkerUpdatePayload } from "@/lib/pwa";

export const SwUpdateBanner = () => {
  const [pending, setPending] = useState<ServiceWorkerUpdatePayload | null>(null);

  useEffect(() => {
    setServiceWorkerUpdateHandler((payload) => {
      if (payload.type === "SW_UPDATE_AVAILABLE") {
        setPending(payload);
      }
    });
    return () => setServiceWorkerUpdateHandler(null);
  }, []);

  if (!pending) return null;

  const reload = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    });
  };

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">A new version of Gymtra is ready.</p>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
          Later
        </Button>
        <Button size="sm" onClick={reload}>
          Update
        </Button>
      </div>
    </div>
  );
};
