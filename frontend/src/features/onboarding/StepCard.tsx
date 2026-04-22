import type { ReactNode } from "react";

interface StepCardProps {
  children: ReactNode;
  hintSlot?: ReactNode;
}

export const StepCard = ({ children, hintSlot }: StepCardProps) => (
  <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
    {children}
    <div className="mt-3 min-h-6 text-sm text-muted-foreground">{hintSlot}</div>
  </div>
);

