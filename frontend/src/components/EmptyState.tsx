import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryHint?: string;
  variant?: "standalone" | "embedded";
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, secondaryHint, variant = "standalone", className }: EmptyStateProps) => (
  <div
    className={cn(
      "rounded-2xl border border-dashed border-border bg-card/50 text-center animate-fade-in",
      variant === "embedded" ? "p-6" : "p-10",
      className
    )}
  >
    <div className={cn("mx-auto rounded-2xl bg-muted/60 flex items-center justify-center", variant === "embedded" ? "w-12 h-12 mb-3" : "w-14 h-14 mb-4")}>
      <Icon className="w-6 h-6 text-muted-foreground" />
    </div>
    <h3 className={cn("font-display font-semibold", variant === "embedded" ? "text-[15px]" : "text-base")}>{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>}
    {secondaryHint && <p className="text-xs text-muted-foreground/90 mt-2 max-w-sm mx-auto">{secondaryHint}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
