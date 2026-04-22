import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { EASING, UI_TIMING } from "@/lib/ui-timing";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const progressValue = value || 0;
  const [lockIn, setLockIn] = React.useState(false);

  React.useEffect(() => {
    setLockIn(true);
    const timer = window.setTimeout(() => setLockIn(false), UI_TIMING.buttonReleaseMs);
    return () => window.clearTimeout(timer);
  }, [progressValue]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 origin-left bg-primary transition-transform"
        style={{
          transform: `${lockIn ? "scaleX(1.02) " : ""}translateX(-${100 - progressValue}%)`,
          transitionDuration: `${Math.max(UI_TIMING.buttonPressMs, UI_TIMING.onboarding.stepTransitionMs - UI_TIMING.staggerMs)}ms`,
          transitionTimingFunction: EASING.standard,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-r from-transparent to-primary/30 transition-opacity"
        style={{
          opacity: lockIn ? 0.7 : 0.18,
          transitionDuration: `${UI_TIMING.buttonReleaseMs}ms`,
          transitionTimingFunction: EASING.entrance,
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
