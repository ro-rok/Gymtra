import * as React from "react";

import { EASING, UI_TIMING } from "@/lib/ui-timing";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-12 w-full rounded-lg border border-border/90 bg-background-elevated px-3 py-2 text-sm text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-muted/90 transition-all focus-visible:outline-none focus-visible:border-primary-neon/40 focus-visible:ring-2 focus-visible:ring-primary-neon/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        style={{
          transitionDuration: `${UI_TIMING.buttonPressMs}ms`,
          transitionTimingFunction: EASING.standard,
        }}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
