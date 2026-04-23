import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMembersRequest } from "@/lib/member-api";
import { listMembershipsRequest, renewMembershipRequest } from "@/lib/membership-api";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, IndianRupee, AlertCircle, CheckCircle2, Search, RefreshCw, Calendar, FileSpreadsheet, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/lib/types";
import type { MemberProfile, Membership } from "@/lib/types";
import { useTenant } from "@/contexts/TenantContext";
import { getGymPlanPricing } from "@/lib/plan-pricing";

const PLANS: PlanType[] = ["Monthly", "Quarterly", "Half-Yearly"];
type LedgerFilterMode = "all" | "month" | "custom";

const toMonthKey = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const toPrettyMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const Memberships = () => {
  const { toast } = useToast();
  const { gym } = useTenant();
  const planPrices = getGymPlanPricing(gym);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending_renewal" | "expired">("all");
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renewingMemberId, setRenewingMemberId] = useState<string | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerFilterMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [memberRows, membershipRows] = await Promise.all([listMembersRequest(), listMembershipsRequest()]);
      setMembers(memberRows);
      setMemberships(membershipRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memberships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRenew = async (memberId: string, plan: PlanType) => {
    const amount = planPrices[plan];
    setRenewingMemberId(memberId);
    try {
      await renewMembershipRequest({ memberId, plan, amount });
      await loadData();
      toast({ title: "Membership renewed", description: `${plan} plan · ₹${amount.toLocaleString("en-IN")}` });
    } catch (err) {
      toast({ title: "Renewal failed", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setRenewingMemberId(null);
    }
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
  const memberNameById = useMemo(
    () => members.reduce<Record<string, string>>((acc, m) => {
      acc[m.id] = m.name;
      return acc;
    }, {}),
    [members]
  );

  const ledgerRows = useMemo(() => {
    const rows = memberships.map((ms) => ({
      ...ms,
      memberName: memberNameById[ms.memberId] || "Unknown member",
      transactionDate: ms.startDate,
      monthKey: toMonthKey(ms.startDate),
      entryType: ms.renewedFromId ? "renewal" : "new",
    }));
    return rows.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [memberships, memberNameById]);

  const filteredLedgerRows = useMemo(() => {
    if (ledgerMode === "all") return ledgerRows;
    if (ledgerMode === "month") {
      return ledgerRows.filter((row) => row.monthKey === selectedMonth);
    }
    if (!fromDate || !toDate) return ledgerRows;
    return ledgerRows.filter((row) => row.transactionDate >= fromDate && row.transactionDate <= toDate);
  }, [ledgerRows, ledgerMode, selectedMonth, fromDate, toDate]);

  const ledgerMonthSummary = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; renewals: number }>();
    filteredLedgerRows.forEach((row) => {
      const prev = map.get(row.monthKey) || { amount: 0, count: 0, renewals: 0 };
      prev.amount += Number(row.amount || 0);
      prev.count += 1;
      if (row.entryType === "renewal") prev.renewals += 1;
      map.set(row.monthKey, prev);
    });
    return Array.from(map.entries())
      .map(([monthKey, value]) => ({ monthKey, ...value }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredLedgerRows]);

  const ledgerTotals = useMemo(() => ({
    amount: filteredLedgerRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    entries: filteredLedgerRows.length,
    renewals: filteredLedgerRows.filter((row) => row.entryType === "renewal").length,
  }), [filteredLedgerRows]);

  const exportFilteredLedgerCsv = () => {
    const escapeCell = (value: string | number) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
    const headers = ["Date", "Month", "Member", "Type", "Plan", "Status", "Amount"];
    const lines = filteredLedgerRows.map((row) =>
      [
        row.transactionDate,
        toPrettyMonth(row.monthKey),
        row.memberName,
        row.entryType === "renewal" ? "Renewal" : "New plan",
        row.plan,
        row.status,
        Number(row.amount || 0),
      ]
        .map(escapeCell)
        .join(",")
    );
    const csv = [headers.map(escapeCell).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `renewal-ledger-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const visible = useMemo(() => members
    .filter(m => filter === "all" || m.status === filter)
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q)), [members, filter, q]);

  return (
    <>
      <PageHeader title="Membership Plans" subtitle="Active, expiring, expired — and one tap to renew." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active plans" value={counts.active} hint={`of ${counts.all}`} icon={CheckCircle2} accent="success" />
        <KpiCard label="Renewals due" value={counts.pending_renewal} icon={AlertCircle} accent="warning" />
        <KpiCard label="Expired" value={counts.expired} icon={CreditCard} accent="destructive" />
        <KpiCard label="Est. monthly" value={`₹${Math.round(monthRevenue / 1000)}K`} hint="recurring revenue" icon={IndianRupee} accent="primary" animated={false} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Renewal Ledger / Balance Sheet
            </div>
            <div className="text-xs text-muted-foreground mt-1">Month-wise history and custom date range.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["month", "custom", "all"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setLedgerMode(mode)}
                className={cn(
                  "px-3 h-8 rounded-md text-xs font-semibold border transition-all",
                  ledgerMode === mode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {mode === "month" ? "Month" : mode === "custom" ? "Custom range" : "All time"}
              </button>
            ))}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={exportFilteredLedgerCsv} disabled={filteredLedgerRows.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ledgerMode === "month" && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Month</div>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
          )}
          {ledgerMode === "custom" && (
            <>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">From</div>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">To</div>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </>
          )}
          <div className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Entries</div>
            <div className="text-lg font-semibold tabular-nums">{ledgerTotals.entries}</div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Renewals</div>
            <div className="text-lg font-semibold tabular-nums">{ledgerTotals.renewals}</div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Collected</div>
            <div className="text-lg font-semibold tabular-nums">₹{ledgerTotals.amount.toLocaleString("en-IN")}</div>
          </div>
        </div>

        {ledgerMode === "custom" && fromDate && toDate && fromDate > toDate && (
          <div className="mt-3 text-xs text-destructive flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            `From` date should be before or equal to `To` date.
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Member</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Plan</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLedgerRows.slice(0, 200).map((row) => (
                <tr key={`ledger-${row.id}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground">{row.transactionDate}</td>
                  <td className="px-4 py-2.5 font-medium">{row.memberName}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                      row.entryType === "renewal" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                    )}>
                      {row.entryType === "renewal" ? "Renewal" : "New plan"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{row.plan}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">₹{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {filteredLedgerRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No ledger entries for selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="text-left px-4 py-2.5">Month</th>
                <th className="text-right px-4 py-2.5">Entries</th>
                <th className="text-right px-4 py-2.5">Renewals</th>
                <th className="text-right px-4 py-2.5">Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerMonthSummary.map((row) => (
                <tr key={`month-${row.monthKey}`}>
                  <td className="px-4 py-2.5 font-medium">{toPrettyMonth(row.monthKey)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.renewals}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">₹{row.amount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {ledgerMonthSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Month summary will appear when transactions are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading memberships...</div>
      ) : error ? (
        <EmptyState icon={CreditCard} title="Could not load memberships" description={error} />
      ) : visible.length === 0 ? (
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
                    <div className="font-display text-lg font-bold tabular-nums">₹{(ms?.amount || planPrices[currentPlan]).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">last paid</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {m.status !== "active" ? (
                      <>
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
                          variant="default"
                          onClick={() => handleRenew(m.id, currentPlan)}
                          disabled={renewingMemberId === m.id}
                          className="gap-1.5 ml-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Renew
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success font-semibold">
                        Active plan
                      </span>
                    )}
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
