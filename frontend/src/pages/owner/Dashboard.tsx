import { Link, useParams } from "react-router-dom";
import { Users, AlertCircle, CalendarCheck, Receipt, MessageCircle, Plus, ArrowUpRight, Bell, Activity, CircleDollarSign } from "lucide-react";
import { KpiCard, KpiCardSkeletonGrid } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SectionCard, SectionCardSkeletonRows } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAttendanceForDayRequest } from "@/lib/attendance-api";
import { listMembersRequest, memberDashboardSummaryRequest } from "@/lib/member-api";
import { listMembershipsRequest } from "@/lib/membership-api";
import { useEffect, useState } from "react";
import { listExpensesRequest } from "@/lib/expenses-api";
import { getLastAction, setLastAction } from "@/lib/onboarding-state";
import { listPendingPasswordResetRequests } from "@/lib/auth-api";
import { getISTDateString, getISTMonthKey } from "@/lib/datetime";

const waLink = (phone: string, msg: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;

const dayDiffFromToday = (isoDate?: string) => {
  if (!isoDate) return null;
  const end = new Date(isoDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  const diffMs = end.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const OwnerDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ pendingRenewal: number; active: number; unpaid?: number } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [continuityHint, setContinuityHint] = useState<string | null>(null);
  const [postCompletionMomentum, setPostCompletionMomentum] = useState(false);
  const [pendingPasswordResetCount, setPendingPasswordResetCount] = useState(0);

  useEffect(() => {
    if (!gymSlug) return;
    const key = `onboarding-just-completed:${gymSlug}`;
    const hint = window.sessionStorage.getItem(key);
    if (hint === "first-member") {
      setContinuityHint("You're set. Next: send reminders and monitor today's check-ins.");
      window.sessionStorage.removeItem(key);
    }
  }, [gymSlug]);

  useEffect(() => {
    if (!gymSlug) return;
    const lastAction = getLastAction(gymSlug);
    if (lastAction === "onboarding_complete") {
      setPostCompletionMomentum(true);
      window.setTimeout(() => {
        const actionEl = document.querySelector("[data-momentum-add-member='true']");
        actionEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 220);
    }
  }, [gymSlug]);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const today = getISTDateString();
    Promise.all([listMembersRequest(), listMembershipsRequest(), memberDashboardSummaryRequest(), getAttendanceForDayRequest(today), listExpensesRequest()])
      .then(([mRows, msRows, sm, attendance, expenses]) => {
        setMembers(mRows);
        setMemberships(msRows);
        setSummary(sm);
        setTodayAttendance(attendance.items);
        const monthPrefix = getISTMonthKey();
        const monthlyExpenses = expenses.filter((e) => e.date.startsWith(monthPrefix)).reduce((sum, e) => sum + e.amount, 0);
        const monthlyMembershipRevenue = msRows
          .filter((ms) => (ms.startDate || "").startsWith(monthPrefix))
          .reduce((sum, ms) => sum + Number(ms.amount || 0), 0);
        setMonthRevenue(Math.max(0, monthlyMembershipRevenue - monthlyExpenses));
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reloadKey]);

  useEffect(() => {
    listPendingPasswordResetRequests()
      .then((res) => setPendingPasswordResetCount(res.total))
      .catch(() => setPendingPasswordResetCount(0));
  }, [reloadKey]);

  const expiring = members.filter((m: any) => {
    const ms = memberships.find((membership) => membership.memberId === m.id);
    return m.status !== "active" || ms?.status === "pending_renewal";
  });
  const ghosts = members.filter((m) => {
    const att = todayAttendance.filter((a) => a.memberId === m.id);
    return att.length === 0 && m.status === "active";
  }).slice(0, 5);
  const unpaidDues = members.filter((m: any) => {
    const ms = memberships.find((membership) => membership.memberId === m.id);
    return ms?.status === "expired" || ms?.status === "pending_renewal";
  }).slice(0, 5);
  const urgentRenewals = expiring.filter((m) => {
    const ms = memberships.find((membership) => membership.memberId === m.id);
    const dueIn = dayDiffFromToday(ms?.expiryDate);
    return m.status === "expired" || (dueIn !== null && dueIn <= 0);
  });
  const normalRenewals = expiring.filter((m) => !urgentRenewals.some((u) => u.id === m.id));
  const urgentAttendance = ghosts.slice(0, 2);
  const normalAttendance = ghosts.slice(2);

  const activeMembers = summary?.active ?? members.filter((m: any) => m.status === "active").length;
  const renewalsDue = summary?.pendingRenewal ?? expiring.length;
  const unpaidCount = summary?.unpaid ?? unpaidDues.length;
  const urgentCount = urgentRenewals.length + urgentAttendance.length + unpaidDues.length;
  const isFirstTime = members.length === 0 || todayAttendance.length === 0;

  const recentActivity = [
    ...todayAttendance.slice(0, 3).map((att) => {
      const member = members.find((m) => m.id === att.memberId);
      return {
        id: `attendance-${att.id}`,
        label: `${member?.name || "Member"} checked in`,
        sub: "Attendance recorded today",
      };
    }),
    ...memberships
      .filter((ms) => ms.status === "pending_renewal" || ms.status === "expired")
      .slice(0, 3)
      .map((ms) => {
        const member = members.find((m) => m.id === ms.memberId);
        return {
          id: `renewal-${ms.id}`,
          label: `${member?.name || "Member"} needs membership follow-up`,
          sub: `Plan ${ms.plan} ends on ${ms.expiryDate || "upcoming date"}`,
        };
      }),
  ].slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0] || "Coach"}`}
        subtitle="Focus on today's decisions first."
        action={
          <>
            <Link to={`/${gymSlug}/owner/reminders`}>
              <Button variant="outline" className="gap-2 relative">
                <Bell className="w-4 h-4" /> Reminders
                {pendingPasswordResetCount > 0 && (
                  <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold">
                    {pendingPasswordResetCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to={`/${gymSlug}/owner/members/new`}>
              <Button
                data-momentum-add-member="true"
                className={`gap-2 ${postCompletionMomentum ? "animate-pulse ring-2 ring-primary/30" : ""}`}
                onClick={() => {
                  if (gymSlug) setLastAction(gymSlug, "added_member");
                  setPostCompletionMomentum(false);
                }}
              >
                <Plus className="w-4 h-4" /> Add Member
              </Button>
            </Link>
          </>
        }
      />

      <div className="md:hidden grid grid-cols-2 gap-2 mb-6">
        <Link to={`/${gymSlug}/owner/members/new`}>
          <Button
            data-momentum-add-member="true"
            className={`w-full h-10 text-xs ${postCompletionMomentum ? "animate-pulse ring-2 ring-primary/30" : ""}`}
            onClick={() => {
              if (gymSlug) setLastAction(gymSlug, "added_member");
              setPostCompletionMomentum(false);
            }}
          >
            Add member
          </Button>
        </Link>
        <Link to={`/${gymSlug}/owner/reminders`}><Button variant="outline" className="w-full h-10 text-xs">Send reminders</Button></Link>
      </div>

      {continuityHint ? (
        <div className="mb-6 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 animate-in fade-in-0 slide-in-from-bottom-1">
          <div className="text-sm font-medium text-emerald-600">Welcome live</div>
          <div className="mt-1 text-sm text-muted-foreground">{continuityHint}</div>
        </div>
      ) : null}

      {postCompletionMomentum ? (
        <div className="mb-6 rounded-2xl border border-primary/35 bg-primary/10 p-4 animate-in fade-in-0">
          <div className="text-sm font-medium text-primary">Start by adding 2-3 members</div>
          <div className="mt-1 text-sm text-muted-foreground">This helps Gymtra surface trends and reminders right away.</div>
        </div>
      ) : null}

      {hasError && !isLoading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Unable to load dashboard data</div>
            <div className="text-xs text-muted-foreground">Retry to load members, renewals, and attendance.</div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto" onClick={() => setReloadKey((k) => k + 1)}>
            Retry <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {isLoading ? (
        <KpiCardSkeletonGrid count={4} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Link to={`/${gymSlug}/owner/memberships`}><KpiCard label="Renewals due" value={renewalsDue} hint="Needs attention today" icon={AlertCircle} accent="warning" /></Link>
          <Link to={`/${gymSlug}/owner/reminders`}><KpiCard label="Unpaid dues" value={unpaidCount} hint="Follow up now" icon={Receipt} accent="destructive" /></Link>
          <Link to={`/${gymSlug}/owner/members`}><KpiCard label="Active members" value={activeMembers} hint="Business snapshot" icon={Users} accent="primary" /></Link>
          <Link to={`/${gymSlug}/owner/expenses`}><KpiCard label="Net revenue (month)" value={`₹${monthRevenue.toLocaleString("en-IN")}`} hint="Memberships - expenses" icon={CircleDollarSign} accent="success" animated={false} /></Link>
        </div>
      )}

      {!isLoading && isFirstTime && (
        <SectionCard title="Start here" description="Complete these quick actions to activate Gymtra." className="mb-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to={`/${gymSlug}/owner/members/new`} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors">
              <div className="font-medium text-sm">1. Add your first member</div>
              <div className="text-xs text-muted-foreground mt-1">Add one member to begin.</div>
            </Link>
            <Link to={`/${gymSlug}/owner/settings`} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors">
              <div className="font-medium text-sm">2. Set pricing</div>
              <div className="text-xs text-muted-foreground mt-1">Set monthly and quarterly plans.</div>
            </Link>
            <Link to={`/${gymSlug}/owner/attendance`} className="rounded-xl border p-4 hover:bg-muted/30 transition-colors">
              <div className="font-medium text-sm">3. Try a check-in</div>
              <div className="text-xs text-muted-foreground mt-1">See who missed check-in today.</div>
            </Link>
          </div>
        </SectionCard>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="What needs attention" description="Handle urgent queues first, then normal follow-up" className="lg:col-span-2">
          {isLoading ? (
            <SectionCardSkeletonRows rows={4} rowClassName="h-14" />
          ) : (
            <div className="divide-y divide-border">
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Urgent renewals</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">{urgentRenewals.length}</span>
                </div>
                {urgentRenewals.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No urgent renewals right now"
                    description="Renewals are under control."
                    secondaryHint="Check normal follow-up next to stay ahead."
                    variant="embedded"
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {urgentRenewals.slice(0, 3).map((m) => {
                      const ms = memberships.find((membership) => membership.memberId === m.id);
                      const dueIn = dayDiffFromToday(ms?.expiryDate);
                      return (
                        <Link key={m.id} to={`/${gymSlug}/owner/members/${m.id}`} className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 flex items-center gap-3 hover:border-warning/50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{m.name}</div>
                            <div className="text-xs text-foreground/80">
                              {dueIn !== null && dueIn < 0 ? `Expired ${Math.abs(dueIn)}d ago` : `Due today`}
                            </div>
                          </div>
                          <StatusBadge status={m.status} />
                          <Button size="sm" className="h-8">Open</Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Urgent attendance follow-up</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">{urgentAttendance.length}</span>
                </div>
                {urgentAttendance.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="Attendance is on track"
                    description="No urgent attendance follow-up right now."
                    variant="embedded"
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {urgentAttendance.map((m) => (
                      <div key={m.id} className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{m.name}</div>
                          <div className="text-xs text-foreground/80">No check-in recorded today</div>
                        </div>
                        <a href={waLink(m.phone, `Hey ${m.name}, your session is waiting for you today.`)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Message</Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unpaid dues</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">{unpaidDues.length}</span>
                </div>
                {unpaidDues.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No unpaid dues pending"
                    description="Tracked memberships are financially clear."
                    variant="embedded"
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {unpaidDues.map((m) => {
                      const ms = memberships.find((membership) => membership.memberId === m.id);
                      return (
                        <div key={`unpaid-${m.id}`} className="rounded-xl border border-destructive/25 bg-destructive/[0.03] px-3 py-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{m.name}</div>
                            <div className="text-xs text-foreground/80">Due {ms?.amount ? `₹${Number(ms.amount).toLocaleString("en-IN")}` : "amount unavailable"}</div>
                          </div>
                          <StatusBadge status={m.status} />
                          <Link to={`/${gymSlug}/owner/reminders`}>
                            <Button size="sm" variant="outline" className="h-8">Remind</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Normal follow-up</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">{normalRenewals.length + normalAttendance.length}</span>
                </div>
                {normalRenewals.length + normalAttendance.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No pending follow-ups"
                    description="Today's action queues are clear."
                    variant="embedded"
                    className="border-0 bg-transparent"
                  />
                ) : (
                  <div className="mt-3 space-y-2">
                    {normalRenewals.slice(0, 2).map((m) => {
                      const ms = memberships.find((membership) => membership.memberId === m.id);
                      return (
                        <div key={`normal-renewal-${m.id}`} className="rounded-xl border border-border px-3 py-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-sm">{m.name}</div>
                            <div className="text-xs text-muted-foreground">Renewal due on {ms?.expiryDate || "-"}</div>
                          </div>
                          <StatusBadge status={m.status} />
                        </div>
                      );
                    })}
                    {normalAttendance.slice(0, 2).map((m) => (
                      <div key={`normal-att-${m.id}`} className="rounded-xl border border-border px-3 py-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-muted-foreground">Needs gentle attendance follow-up</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Normal</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent activity" description={isLoading ? "Loading activity..." : `${recentActivity.length} recent updates`} className="lg:col-span-1">
          {isLoading ? (
            <SectionCardSkeletonRows rows={5} />
          ) : recentActivity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet today"
              description="New actions appear here automatically."
              className="border-0 bg-transparent p-6"
              action={
                <Link to={`/${gymSlug}/owner/members/new`}>
                  <Button size="sm" className="gap-1.5">Add your first member</Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                </div>
              ))}
              <Link to={`/${gymSlug}/owner/reminders`} className="px-5 py-3 flex items-center justify-between text-sm font-medium text-primary hover:bg-muted/30 transition-colors">
                Open reminders
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </SectionCard>
      </div>

      {!isLoading && !hasError && (expiring.length > 0 || ghosts.length > 0 || unpaidCount > 0) && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Next best action</div>
            <div className="text-xs text-muted-foreground">
              {urgentCount > 0 ? "Clear urgent renewals and unpaid dues first." : "Review normal follow-up and keep momentum steady."}
            </div>
          </div>
          <Link to={urgentRenewals.length > 0 ? `/${gymSlug}/owner/memberships` : `/${gymSlug}/owner/reminders`} className="w-full sm:w-auto">
            <Button size="sm" className="gap-1.5 w-full sm:w-auto">
              {urgentRenewals.length > 0 ? "Open renewals" : "Send reminders"} <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </>
  );
};

export default OwnerDashboard;
