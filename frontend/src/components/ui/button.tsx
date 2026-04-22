import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { EASING, SPRING, UI_TIMING } from "@/lib/ui-timing";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-neon/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary-neon text-primary-foreground shadow-[0_10px_24px_-18px_hsl(var(--primary-neon)/0.36)] hover:-translate-y-0.5 hover:bg-primary-neon-hover hover:shadow-[0_12px_28px_-18px_hsl(var(--primary-neon)/0.42)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-white/15 bg-white/[0.02] text-text-primary hover:-translate-y-0.5 hover:border-primary-neon/40 hover:bg-white/[0.06] hover:text-text-primary",
        secondary: "bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/85",
        ghost: "border border-transparent text-text-secondary hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] hover:text-text-primary",
        link: "text-primary-neon underline-offset-4 hover:text-primary-neon-soft hover:underline",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-10 rounded-md px-3",
        lg: "h-12 rounded-md px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{
          transitionDuration: `${UI_TIMING.buttonPressMs}ms`,
          transitionTimingFunction: SPRING.subtle,
          transitionProperty: "transform, opacity, box-shadow, background-color, border-color, color",
          animationTimingFunction: EASING.standard,
          ...style,
        }}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
