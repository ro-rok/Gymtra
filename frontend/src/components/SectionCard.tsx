import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  viewAllLink?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyPadding?: "none" | "dense" | "default";
}

interface SectionCardSkeletonRowsProps {
  rows?: number;
  className?: string;
  rowClassName?: string;
}

const bodyPaddingMap = {
  none: "",
  dense: "p-4",
  default: "p-5",
};

export const SectionCard = ({ title, description, action, viewAllLink, children, className, bodyClassName, bodyPadding = "none" }: SectionCardProps) => (
  <div className={cn("rounded-2xl border border-border bg-card overflow-hidden shadow-sm", className)}>
    <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-display font-semibold text-sm">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs text-primary inline-flex items-center gap-1 hover:gap-1.5 transition-all">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
    <div className={cn(bodyPaddingMap[bodyPadding], bodyClassName)}>{children}</div>
  </div>
);

export const SectionCardSkeletonRows = ({ rows = 4, className, rowClassName }: SectionCardSkeletonRowsProps) => (
  <div className={cn("p-5 space-y-3", className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={`section-skeleton-row-${i}`} className={cn("h-12 rounded-xl bg-muted animate-pulse", rowClassName)} />
    ))}
  </div>
);
