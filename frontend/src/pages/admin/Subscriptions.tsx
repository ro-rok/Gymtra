import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import { getGyms, getSubscriptions, updateSubscription } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const AdminSubscriptions = () => {
  const { toast } = useToast();
  const [, setRefresh] = useState(0);
  const subs = getSubscriptions();
  const gyms = getGyms();

  const totalMrr = subs.filter(s => s.status === "active").reduce((sum, s) => sum + (s.monthlyAmount || 0) + Math.max(0, s.usedSeats - 1) * (s.extraSeatPrice || 0), 0);
  const activeCount = subs.filter(s => s.status === "active").length;
  const trialCount = subs.filter(s => s.status === "trial").length;

  const toggleStatus = (id: string, current: string) => {
    const next = current === "active" ? "expired" : "active";
    updateSubscription(id, { status: next as any });
    toast({ title: `Marked ${next}` });
    setRefresh(n => n + 1);
  };

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Base plan + per-seat pricing across all tenants." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="MRR" value={`₹${totalMrr.toLocaleString("en-IN")}`} icon={CreditCard} accent="primary" animated={false} />
        <KpiCard label="Active" value={activeCount} hint={`of ${subs.length}`} icon={TrendingUp} accent="success" />
        <KpiCard label="On trial" value={trialCount} icon={Users} accent="accent" />
        <KpiCard label="Avg. seats" value={Math.round(subs.reduce((s, x) => s + x.usedSeats, 0) / Math.max(1, subs.length))} icon={Users} accent="warning" />
      </div>

      <div className="grid gap-3">
        {subs.map((s) => {
          const gym = gyms.find(g => g.id === s.gymId);
          const usagePct = (s.usedSeats / s.seats) * 100;
          const computed = (s.monthlyAmount || 0) + Math.max(0, s.usedSeats - 1) * (s.extraSeatPrice || 0);
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5 hover-lift">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-xl gradient-card border border-border flex items-center justify-center text-xl">{gym?.logo || "🏋️"}</div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">{gym?.name || s.gymId}</div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.plan} · {s.startDate} → {s.endDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold tabular-nums">₹{computed.toLocaleString("en-IN")}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-[10px] text-muted-foreground">Base ₹{s.monthlyAmount} + ₹{s.extraSeatPrice}/seat</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(s.id, s.status)}>
                  {s.status === "active" ? "Suspend" : "Reactivate"}
                </Button>
              </div>

              {/* Seat usage bar */}
              <div className="mt-4 grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-muted-foreground">Seats</span>
                    <span className="font-semibold">{s.usedSeats} / {s.seats}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${usagePct > 90 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(100, usagePct)}%` }} />
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-[10px] uppercase tracking-wider">Plan tier</div>
                  <div className="font-semibold text-foreground">{s.plan}</div>
                </div>
                <div className="text-muted-foreground">
                  <div className="text-[10px] uppercase tracking-wider">Extra seats</div>
                  <div className="font-semibold text-foreground">{Math.max(0, s.usedSeats - 1)} × ₹{s.extraSeatPrice}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AdminSubscriptions;
