import { Building2, Users, CreditCard, TrendingUp, Plus, ArrowUpRight, Activity } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getKeepaliveStatusRequest, listAdminGymsRequest, type KeepaliveStatus } from "@/lib/admin-api";
import { listAdminSubscriptionsRequest, toSubscription } from "@/lib/subscription-admin-api";
import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { getPlatformAnalyticsOverviewRequest, type PlatformAnalyticsOverview } from "@/lib/analytics-api";
import { PlatformTrendChart } from "@/components/Charts";

const formatNextPing = (seconds: number | null) => {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const keepaliveBadgeStatus = (status: KeepaliveStatus | null): string => {
  if (!status?.enabled) return "inactive";
  if (!status.lastPingAt) return "waiting";
  return status.isHealthy ? "healthy" : "stale";
};

const AdminDashboard = () => {
  const [gyms, setGyms] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalyticsOverview | null>(null);
  const [keepalive, setKeepalive] = useState<KeepaliveStatus | null>(null);

  const loadKeepalive = useCallback(() => {
    getKeepaliveStatusRequest()
      .then(setKeepalive)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    Promise.all([listAdminGymsRequest(), listAdminSubscriptionsRequest(), getPlatformAnalyticsOverviewRequest()])
      .then(([g, s, analytics]) => {
        setGyms(g);
        setSubs(s.map(toSubscription));
        setPlatformAnalytics(analytics);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadKeepalive();
    const timer = window.setInterval(loadKeepalive, 60_000);
    return () => window.clearInterval(timer);
  }, [loadKeepalive]);
  const totalMembers = gyms.reduce((s, g: any) => s + (g.members || 0), 0);
  const activeGyms = gyms.filter(g => g.isActive).length;
  const mrr = subs.filter(s => s.status === "active").reduce((sum, s) => sum + (s.monthlyAmount || 0) + Math.max(0, s.usedSeats - 1) * (s.extraSeatPrice || 0), 0);
  const totalSeats = subs.reduce((s, sub) => s + sub.seats, 0);
  const usedSeats = subs.reduce((s, sub) => s + sub.usedSeats, 0);
  const seatUtil = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Platform Overview"
        subtitle="All gyms, all systems."
        action={
          <Link to="/admin/gyms">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Gym</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active Gyms" value={activeGyms} hint={`of ${gyms.length} total`} icon={Building2} accent="primary" trend="up" trendValue={platformAnalytics ? `${platformAnalytics.retentionActiveGymsPct}%` : undefined} />
        <KpiCard label="Total Members" value={platformAnalytics?.activeMembersPlatform ?? totalMembers} icon={Users} accent="accent" trend="up" trendValue={platformAnalytics ? `${platformAnalytics.onboardingCompletionPct}% onboarded` : undefined} />
        <KpiCard label="MRR" value={`â‚¹${mrr.toLocaleString("en-IN")}`} hint="recurring" icon={CreditCard} accent="success" animated={false} />
        <KpiCard label="Seat Utilization" value={`${seatUtil}%`} hint={`${usedSeats}/${totalSeats}`} icon={TrendingUp} accent="warning" animated={false} />
      </div>

      <SectionCard title="API Keep-Alive" className="mb-6">
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">Render instance wake-up</div>
                <div className="text-xs text-muted-foreground">
                  Self-ping every {keepalive ? Math.round(keepalive.intervalSeconds / 60) : 14} minutes
                </div>
              </div>
            </div>
            <StatusBadge status={keepaliveBadgeStatus(keepalive)} />
          </div>
          {keepalive ? (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Last ping</div>
                <div className="font-medium mt-1">
                  {keepalive.lastPingAt
                    ? format(new Date(keepalive.lastPingAt), "d MMM yyyy, h:mm a")
                    : "Not yet"}
                </div>
                {keepalive.lastPingAt ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(keepalive.lastPingAt), { addSuffix: true })}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Next ping (est.)</div>
                <div className="font-medium mt-1">{formatNextPing(keepalive.nextPingInSeconds)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {keepalive.pingCount} total ping{keepalive.pingCount === 1 ? "" : "s"}
                  {keepalive.enabled ? " on Render" : " (local — service disabled)"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Loading keep-alive status…</div>
          )}
        </div>
      </SectionCard>

      {platformAnalytics ? (
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <SectionCard title="Gym growth" className="lg:col-span-2">
              <PlatformTrendChart data={platformAnalytics.gymGrowthTrend} />
            </SectionCard>
            <SectionCard title="MRR trend">
              <PlatformTrendChart data={platformAnalytics.mrrTrend} />
              <div className="px-5 pb-4 text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
                <div>Daily active gyms: <span className="text-foreground font-medium">{platformAnalytics.dailyActiveGyms}</span></div>
                <div>Demo to signup: <span className="text-foreground font-medium">{platformAnalytics.demoToSignupPct}%</span></div>
              </div>
            </SectionCard>
          </div>
        ) : null}

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Recent gyms" viewAllLink="/admin/gyms" className="lg:col-span-2">
          <div className="divide-y divide-border">
            {gyms.slice(0, 6).map((g) => (
              <div key={g.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 h-10 rounded-xl gradient-card border border-border flex items-center justify-center text-xl">{g.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{g.name}</div>
                  <div className="text-xs text-muted-foreground">/{g.slug} Â· {g.city}</div>
                </div>
                <StatusBadge status={g.isActive ? "active" : "inactive"} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Subscription health" viewAllLink="/admin/subscriptions">
          <div className="divide-y divide-border">
            {subs.slice(0, 4).map((s) => {
              const gym = gyms.find(g => g.id === s.gymId);
              return (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold truncate">{gym?.name || s.gymId}</div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.plan} Â· {s.usedSeats}/{s.seats} seats</div>
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(s.usedSeats / s.seats) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </>
  );
};

export default AdminDashboard;

