import { Plus, Wallet, CheckCircle2, Clock, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { listStaffRequest } from "@/lib/staff-api";
import { createPayrollRecordRequest, listPayrollRecordsRequest, updatePayrollRecordRequest } from "@/lib/payroll-api";
import { createLeaveRecordRequest, listLeaveRecordsRequest, updateLeaveRecordRequest } from "@/lib/leave-api";

const Payroll = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setRefresh] = useState(0);
  const refresh = () => setRefresh(n => n + 1);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", role: "Trainer", salary: "" });

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staffId: "", date: new Date().toISOString().split("T")[0], reason: "", type: "sick" as "sick" | "vacation" | "personal" });

  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [leave, setLeave] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([listStaffRequest(), listPayrollRecordsRequest(), listLeaveRecordsRequest()])
      .then(([staffRows, payrollRows, leaveRows]) => {
        setAllStaff(staffRows);
        setPayroll(payrollRows);
        setLeave(leaveRows.filter((l: any) => l.status !== "cancelled"));
      })
      .catch(() => {
        setAllStaff([]);
        setPayroll([]);
        setLeave([]);
      });
  }, []);

  const monthKey = new Date().toISOString().slice(0, 7);
  const payrollByStaff = useMemo(() => {
    const map = new Map<string, any>();
    payroll
      .filter((r) => r.month === monthKey)
      .forEach((r) => map.set(r.staffId, r));
    return map;
  }, [payroll, monthKey]);
  const totalSalary = allStaff.reduce((s, m) => s + (payrollByStaff.get(m.id)?.amount ?? m.salary ?? 0), 0);
  const paidCount = allStaff.filter(s => s.status === "paid").length;
  const pendingTotal = allStaff
    .filter((s) => s.status === "pending")
    .reduce((s, m) => s + (payrollByStaff.get(m.id)?.amount ?? m.salary ?? 0), 0);

  const togglePaid = async (id: string, current: "paid" | "pending") => {
    const next = current === "paid" ? "pending" : "paid";
    const existing = payroll.find((r) => r.staffId === id && r.month === monthKey);
    if (existing) {
      await updatePayrollRecordRequest(existing.id, { status: next });
    } else {
      const staff = allStaff.find((s) => s.id === id);
      await createPayrollRecordRequest({ staffId: id, month: monthKey, amount: Number(staff?.salary || 0), status: next });
    }
    const latest = await listPayrollRecordsRequest();
    setPayroll(latest);
    const latestStaff = await listStaffRequest();
    setAllStaff(latestStaff);
    toast({ title: next === "paid" ? "Marked as paid 💰" : "Marked pending" });
    refresh();
  };

  const addStaff = () => {
    toast({ title: "Create staff from user accounts in this phase." });
    setShowStaffForm(false);
    setStaffForm({ name: "", role: "Trainer", salary: "" });
    refresh();
  };

  const addLeave = async () => {
    const staff = allStaff.find(s => s.id === leaveForm.staffId);
    await createLeaveRecordRequest({
      staffId: leaveForm.staffId,
      date: leaveForm.date, reason: leaveForm.reason || undefined, type: leaveForm.type,
    });
    const latest = await listLeaveRecordsRequest();
    setLeave(latest.filter((l: any) => l.status !== "cancelled"));
    toast({ title: "Leave recorded" });
    setShowLeaveForm(false);
    setLeaveForm({ staffId: "", date: new Date().toISOString().split("T")[0], reason: "", type: "sick" });
    refresh();
  };

  const removeLeave = async (id: string) => {
    await updateLeaveRecordRequest(id, { status: "cancelled" });
    const latest = await listLeaveRecordsRequest();
    setLeave(latest.filter((l: any) => l.status !== "cancelled"));
    toast({ title: "Leave removed" });
    refresh();
  };

  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Payroll & Leave" subtitle={monthLabel} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total payroll" value={`₹${totalSalary.toLocaleString("en-IN")}`} icon={Wallet} accent="primary" animated={false} />
        <KpiCard label="Paid" value={paidCount} hint={`of ${allStaff.length}`} icon={CheckCircle2} accent="success" />
        <KpiCard label="Pending" value={`₹${pendingTotal.toLocaleString("en-IN")}`} icon={Clock} accent="warning" animated={false} />
        <KpiCard label="Leaves" value={leave.length} hint="this month" icon={CalendarIcon} accent="accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard
          title="Salaries"
          description={`${monthLabel}`}
          action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowStaffForm(s => !s)}><Plus className="w-3.5 h-3.5" /> Add</Button>}
        >
          {showStaffForm && (
            <div className="p-4 border-b border-border bg-muted/20 grid grid-cols-3 gap-2">
              <Input placeholder="Name" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
              <Input placeholder="Role" value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} />
              <Input placeholder="Salary" type="number" value={staffForm.salary} onChange={e => setStaffForm({ ...staffForm, salary: e.target.value })} />
              <div className="col-span-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowStaffForm(false)}>Cancel</Button>
                <Button size="sm" onClick={addStaff} disabled={!staffForm.name || !staffForm.salary}>Save</Button>
              </div>
            </div>
          )}

          {allStaff.length === 0 ? (
            <EmptyState icon={Wallet} title="No staff yet" description="Add your first team member to start tracking payroll." className="border-0 bg-transparent" />
          ) : (
            <div className="divide-y divide-border">
              {allStaff.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{s.name.split(" ").map(n => n[0]).join("")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-sm tabular-nums">₹{s.salary.toLocaleString("en-IN")}</div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${s.status === "paid" ? "text-success" : "text-warning"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === "paid" ? "bg-success" : "bg-warning"}`} /> {s.status}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={s.status === "paid" ? "outline" : "default"}
                    onClick={() => togglePaid(s.id, s.status)}
                    className="shrink-0"
                  >
                    {s.status === "paid" ? "Undo" : "Mark paid"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Leave records"
          description={`${leave.length} entries`}
          action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowLeaveForm(s => !s)}><Plus className="w-3.5 h-3.5" /> Add</Button>}
        >
          {showLeaveForm && (
            <div className="p-4 border-b border-border bg-muted/20 grid grid-cols-2 gap-2">
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={leaveForm.staffId} onChange={e => setLeaveForm({ ...leaveForm, staffId: e.target.value })}>
                <option value="">Select staff…</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input type="date" value={leaveForm.date} onChange={e => setLeaveForm({ ...leaveForm, date: e.target.value })} />
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}>
                <option value="sick">Sick</option>
                <option value="vacation">Vacation</option>
                <option value="personal">Personal</option>
              </select>
              <Input placeholder="Reason (optional)" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
                <Button size="sm" onClick={addLeave} disabled={!leaveForm.staffId}>Save</Button>
              </div>
            </div>
          )}

          {leave.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="No leave records" description="When staff request time off, log it here. 🌴" className="border-0 bg-transparent" />
          ) : (
            <div className="divide-y divide-border">
              {leave.map(l => (
                <div key={l.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className={`w-2 h-10 rounded-full ${l.type === "sick" ? "bg-destructive" : l.type === "vacation" ? "bg-accent" : "bg-warning"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{l.staffName || "Staff"}</div>
                    <div className="text-xs text-muted-foreground">{l.date} · {l.type}{l.reason && ` · ${l.reason}`}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeLeave(l.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
};

export default Payroll;
