import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  accent?: "primary" | "accent" | "warning" | "destructive" | "success";
  animated?: boolean;
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

const trendColor = { up: "text-success", down: "text-destructive", flat: "text-muted-foreground" };
const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };

export const KpiCard = ({ label, value, hint, icon: Icon, trend, trendValue, accent = "primary", animated = true }: KpiCardProps) => {
  const numericValue = typeof value === "number" ? value : null;
  const Tr = trend ? TrendIcon[trend] : null;

  return (
    <div className="group rounded-2xl bg-card border border-border p-5 shadow-sm hover-lift relative overflow-hidden">
      <div className={cn("absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity", accent === "primary" ? "bg-primary/30" : accent === "accent" ? "bg-accent/30" : accent === "warning" ? "bg-warning/30" : accent === "destructive" ? "bg-destructive/30" : "bg-success/30")} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="mt-2 text-3xl font-display font-bold text-foreground tabular-nums">
            {animated && numericValue !== null ? <AnimatedCounter value={numericValue} /> : value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {Tr && trendValue && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trendColor[trend!])}>
                <Tr className="w-3 h-3" />{trendValue}
              </span>
            )}
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", accentMap[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
