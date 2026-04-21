import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
import { listStaffRequest } from "@/lib/staff-api";
import type { StaffMember } from "@/lib/types";

const Staff = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Trainer", salary: "" });
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  useEffect(() => {
    listStaffRequest().then(setAllStaff).catch(() => setAllStaff([]));
  }, []);

  const handleAdd = () => {
    toast({ title: "Staff is managed from user accounts in this phase." });
    setShowForm(false);
    setForm({ name: "", role: "Trainer", salary: "" });
  };

  return (
    <>
      <PageHeader title="Staff" subtitle={`${allStaff.length} team members`}
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> Add Staff</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-3 animate-scale-in">
          <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Role</Label><Input className="mt-1" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
          <div><Label>Salary (₹)</Label><Input className="mt-1" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={handleAdd} disabled={!form.name}>Save</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {allStaff.length === 0 ? (
        <EmptyState icon={Users} title="No staff yet" description="Add your team members to track payroll and roles." action={<Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> Add staff</Button>} />
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {allStaff.map((s) => (
            <div key={s.id} className="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-full gradient-card border border-border flex items-center justify-center text-xs font-bold">{s.name.split(" ").map(n => n[0]).join("")}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role} · ₹{s.salary.toLocaleString("en-IN")}</div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-semibold inline-flex items-center gap-1 ${s.status === "paid" ? "text-success" : "text-warning"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.status === "paid" ? "bg-success" : "bg-warning"}`} />
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
export default Staff;
