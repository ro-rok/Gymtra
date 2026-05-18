import { ReactNode } from "react";

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-fade-in">
    <div className="min-w-0 flex-1">
      <h1 className="text-xl sm:text-2xl md:text-[28px] font-display font-bold text-foreground tracking-tight break-words">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex flex-wrap gap-2 w-full sm:w-auto [&_button]:min-h-10">{action}</div>}
  </div>
);
