import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

export const OnlineReconnectBanner = () => {
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      if (!navigator.onLine) return;
      setShowBackOnline(true);
      const t = window.setTimeout(() => setShowBackOnline(false), 3200);
      return () => window.clearTimeout(t);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (!showBackOnline) return null;

  return (
    <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-success/40 bg-card/95 px-4 py-2 text-xs text-success shadow-md animate-in fade-in-0 slide-in-from-top-2">
      <Wifi className="w-3.5 h-3.5" />
      You are back online
    </div>
  );
};
