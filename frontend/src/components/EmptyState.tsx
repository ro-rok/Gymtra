import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn("rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center animate-fade-in", className)}>
    <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-muted-foreground" />
    </div>
    <h3 className="font-display font-semibold text-base">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
