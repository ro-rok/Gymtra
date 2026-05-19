import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  expired: "bg-destructive/10 text-destructive border-destructive/30",
  pending_renewal: "bg-warning/20 text-warning border-warning/40",
  paid: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/40",
  trial: "bg-accent/15 text-accent border-accent/30",
  suspended: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  healthy: "bg-success/15 text-success border-success/30",
  stale: "bg-warning/20 text-warning border-warning/40",
  waiting: "bg-accent/15 text-accent border-accent/30",
};

const labels: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  pending_renewal: "Renewal due",
  paid: "Paid",
  pending: "Pending",
  trial: "Trial",
  suspended: "Suspended",
  inactive: "Inactive",
  healthy: "Running",
  stale: "Stale",
  waiting: "Waiting",
};

const dotColor: Record<string, string> = {
  active: "bg-success",
  expired: "bg-destructive",
  pending_renewal: "bg-warning",
  paid: "bg-success",
  pending: "bg-warning",
  trial: "bg-accent",
  suspended: "bg-muted-foreground",
  inactive: "bg-muted-foreground",
  healthy: "bg-success",
  stale: "bg-warning",
  waiting: "bg-accent",
};

export const StatusBadge = ({ status, withDot = true }: { status: string; withDot?: boolean }) => (
  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", map[status] || map.suspended)}>
    {withDot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColor[status] || "bg-muted-foreground")} />}
    {labels[status] || status}
  </span>
);
