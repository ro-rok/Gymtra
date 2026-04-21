import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberMembership } from "@/lib/data-service";
import { CreditCard, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Membership = () => {
  const { user } = useAuth();
  const memberId = user?.id === "u-member-1" ? "m1" : user?.id || "";
  const ms = getMemberMembership(memberId);

  if (!ms) {
    return (
      <>
        <PageHeader title="Your Plan" />
        <EmptyState
          icon={CreditCard}
          title="No active plan"
          description="Talk to the front desk to get your membership set up."
        />
      </>
    );
  }

  const expiry = new Date(ms.expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const start = new Date(ms.startDate);
  const total = Math.ceil((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const usedPct = Math.max(0, Math.min(100, ((total - daysLeft) / total) * 100));

  return (
    <>
      <PageHeader title="Your Plan" subtitle="Quick view of your current membership." />

      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 md:p-8 relative overflow-hidden mb-6">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">{ms.plan} Plan</div>
              <div className="text-4xl font-display font-bold mt-1.5 tabular-nums">₹{ms.amount.toLocaleString("en-IN")}</div>
            </div>
            <StatusBadge status={ms.status} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-secondary-foreground/60 text-[10px] uppercase tracking-wider font-semibold">Started</div>
              <div className="font-semibold mt-0.5">{ms.startDate}</div>
            </div>
            <div>
              <div className="text-secondary-foreground/60 text-[10px] uppercase tracking-wider font-semibold">Renews on</div>
              <div className="font-semibold mt-0.5">{ms.expiryDate}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-secondary-foreground/70 mb-1.5">
              <span>{daysLeft > 0 ? `${daysLeft} days left` : "Expired"}</span>
              <span>{Math.round(usedPct)}% used</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all duration-700" style={{ width: `${usedPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {daysLeft <= 14 && daysLeft > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-warning shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Renewal coming up</div>
            <div className="text-xs text-muted-foreground">Talk to the front desk to renew before {ms.expiryDate}.</div>
          </div>
        </div>
      )}
    </>
  );
};
export default Membership;
