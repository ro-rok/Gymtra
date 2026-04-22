import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { EASING, UI_TIMING } from "@/lib/ui-timing";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div
      key={location.pathname}
      className="animate-in fade-in-0 zoom-in-[0.992]"
      style={{
        animationDuration: `${UI_TIMING.routeFadeMs}ms`,
        animationTimingFunction: EASING.standard,
      }}
    >
      {children}
    </div>
  );
};
