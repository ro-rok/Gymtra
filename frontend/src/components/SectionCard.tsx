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
}

export const SectionCard = ({ title, description, action, viewAllLink, children, className, bodyClassName }: SectionCardProps) => (
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
    <div className={cn(bodyClassName)}>{children}</div>
  </div>
);
