import { useEffect, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/web";
import { Droplets, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WATER_GOAL_LITERS = 3;
const STEP_LITERS = 0.25;

interface WaterTrackerProps {
  liters: number;
  onChange: (liters: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const WaterTracker = ({ liters, onChange, disabled, isLoading }: WaterTrackerProps) => {
  const [celebrateGoal, setCelebrateGoal] = useState(false);
  const prevLiters = useRef(liters);
  const pct = Math.min(100, Math.round((liters / WATER_GOAL_LITERS) * 100));
  const goalReached = liters >= WATER_GOAL_LITERS;

  const fillSpring = useSpring({
    height: `${pct}%`,
    config: { tension: 180, friction: 22 },
  });

  useEffect(() => {
    if (liters >= WATER_GOAL_LITERS && prevLiters.current < WATER_GOAL_LITERS) {
      setCelebrateGoal(true);
      const t = window.setTimeout(() => setCelebrateGoal(false), 2400);
      return () => window.clearTimeout(t);
    }
    prevLiters.current = liters;
  }, [liters]);

  const adjust = (delta: number) => {
    const next = Math.max(0, Number((liters + delta).toFixed(1)));
    onChange(next);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all",
        goalReached || celebrateGoal
          ? "border-success/50 bg-success/5 shadow-[0_0_24px_hsl(var(--success)/0.15)]"
          : liters > 0
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card",
        celebrateGoal && "animate-celebrate",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
            goalReached
              ? "bg-success text-success-foreground"
              : liters > 0
                ? "bg-primary text-primary-foreground"
                : "bg-accent/10 text-accent",
          )}
        >
          <Droplets className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Water log</div>
          <div className="text-xs text-muted-foreground">
            {liters.toFixed(1)}L / {WATER_GOAL_LITERS.toFixed(1)}L · {pct}%
            {goalReached ? " · Goal reached!" : ""}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11"
            onClick={() => adjust(-STEP_LITERS)}
            disabled={disabled || isLoading || liters <= 0}
            aria-label="Decrease water"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="w-14 text-center font-display font-bold text-sm tabular-nums">{liters.toFixed(1)}L</span>
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 water-plus-btn"
            onClick={() => adjust(STEP_LITERS)}
            disabled={disabled || isLoading}
            aria-label="Increase water"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 relative h-28 rounded-2xl border border-border/80 bg-muted/40 overflow-hidden">
        <animated.div
          className="absolute inset-x-0 bottom-0 water-fill-layer"
          style={{ height: fillSpring.height }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/55 to-primary/25 water-surface" />
        </animated.div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-display font-bold tabular-nums text-foreground/90 drop-shadow-sm">{pct}%</span>
        </div>
      </div>
    </div>
  );
};
