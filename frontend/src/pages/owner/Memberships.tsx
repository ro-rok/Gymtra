import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, getMemberships, renewMembership } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CreditCard, IndianRupee, AlertCircle, CheckCircle2, Search, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/lib/types";

const PLAN_PRICES: Record<PlanType, number> = { Monthly: 1500, Quarterly: 4000, "Half-Yearly": 7000 };
const PLANS: PlanType[] = ["Monthly", "Quarterly", "Half-Yearly"];

const Memberships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const gymId = user?.gymId || "1";
  const [, setRefresh] = useState(0);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending_renewal" | "expired">("all");
  const members = getMembers(gymId);
  const memberships = getMemberships(gymId);

  const handleRenew = (memberId: string, plan: PlanType) => {
    const amount = PLAN_PRICES[plan];
    renewMembership(memberId, plan, amount);
    toast({ title: "Membership renewed 🎉", description: `${plan} plan · ₹${amount.toLocaleString("en-IN")}` });
    setRefresh(n => n + 1);
  };

  const counts = {
    all: members.length,
    active: members.filter(m => m.status === "active").length,
    pending_renewal: members.filter(m => m.status === "pending_renewal").length,
    expired: members.filter(m => m.status === "expired").length,
  };

  const monthRevenue = memberships
    .filter(ms => ms.status === "active")
    .reduce((s, ms) => s + (ms.plan === "Monthly" ? ms.amount : ms.plan === "Quarterly" ? ms.amount / 3 : ms.amount / 6), 0);

  const dueSoonCount = members.filter(m => m.status === "pending_renewal" || m.status === "expired").length;

  const visible = members
    .filter(m => filter === "all" || m.status === filter)
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q));

  return (
    <>
      <PageHeader title="Membership Plans" subtitle="Active, expiring, expired — and one tap to renew." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active plans" value={counts.active} hint={`of ${counts.all}`} icon={CheckCircle2} accent="success" />
        <KpiCard label="Renewals due" value={counts.pending_renewal} icon={AlertCircle} accent="warning" />
        <KpiCard label="Expired" value={counts.expired} icon={CreditCard} accent="destructive" />
        <KpiCard label="Est. monthly" value={`₹${Math.round(monthRevenue / 1000)}K`} hint="recurring revenue" icon={IndianRupee} accent="primary" animated={false} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone…" className="pl-10" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {(["all", "active", "pending_renewal", "expired"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3 h-9 rounded-lg text-xs font-medium border transition-all",
                filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {f === "all" ? "All" : f === "pending_renewal" ? "Due" : f.charAt(0).toUpperCase() + f.slice(1)} · {counts[f]}
            </button>
          ))}
        </div>
      </div>

      {dueSoonCount > 0 && filter === "all" && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 mb-4 flex items-center gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-lg bg-warning/20 text-warning flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-sm flex-1">
            <span className="font-semibold">{dueSoonCount} member{dueSoonCount === 1 ? "" : "s"}</span>
            <span className="text-muted-foreground"> need renewal action</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFilter("pending_renewal")}>Show due</Button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={q ? `No matches for "${q}"` : "Nothing here"}
          description={q ? "Try clearing your filter or search." : "All members in this bucket are sorted out."}
        />
      ) : (
        <div className="grid gap-3">
          {visible.map((m) => {
            const ms = memberships
              .filter(ms => ms.memberId === m.id)
              .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
            const daysLeft = ms ? Math.ceil((new Date(ms.expiryDate).getTime() - Date.now()) / 86400000) : 0;
            const currentPlan = (ms?.plan || "Monthly") as PlanType;

            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4 md:p-5 hover-lift">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-11 h-11 rounded-full gradient-card border border-border flex items-center justify-center text-xs font-bold shrink-0">{m.avatar}</div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> {ms?.plan || "—"} · expires {ms?.expiryDate || "—"}
                      {ms && (
                        <span className={cn(
                          "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          daysLeft < 0 ? "bg-destructive/10 text-destructive" :
                          daysLeft <= 14 ? "bg-warning/15 text-warning" :
                          "bg-success/10 text-success"
                        )}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="font-display text-lg font-bold tabular-nums">₹{(ms?.amount || PLAN_PRICES[currentPlan]).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">last paid</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {PLANS.map(p => (
                      <button
                        key={p}
                        onClick={() => handleRenew(m.id, p)}
                        className={cn(
                          "px-2.5 h-8 rounded-md text-[11px] font-semibold border transition-all",
                          p === currentPlan
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {p === "Half-Yearly" ? "6mo" : p === "Quarterly" ? "3mo" : "1mo"}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant={m.status === "active" ? "outline" : "default"}
                      onClick={() => handleRenew(m.id, currentPlan)}
                      className="gap-1.5 ml-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Renew
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
export default Memberships;
