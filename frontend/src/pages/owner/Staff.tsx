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
import { createTrainerRequest, listStaffRequest } from "@/lib/staff-api";
import type { StaffMember } from "@/lib/types";

const Staff = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "trainer", salary: "" });
  const [saving, setSaving] = useState(false);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  useEffect(() => {
    listStaffRequest().then(setAllStaff).catch(() => setAllStaff([]));
  }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.salary) return;
    setSaving(true);
    try {
      await createTrainerRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: "trainer",
        salary: Number(form.salary),
      });
      const latest = await listStaffRequest();
      setAllStaff(latest);
      toast({ title: "Trainer created successfully" });
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "trainer", salary: "" });
    } catch (error) {
      toast({ title: "Could not create trainer", description: "Please check details and try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Staff" subtitle={`${allStaff.length} team members`}
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> Add Staff</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-3 gap-3 animate-scale-in">
          <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input className="mt-1" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Password</Label><Input className="mt-1" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div><Label>Role</Label><Input className="mt-1" value="trainer" disabled /></div>
          <div><Label>Salary (₹)</Label><Input className="mt-1" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={handleAdd} disabled={saving || !form.name || !form.email || !form.phone || !form.password || !form.salary}>
              {saving ? "Saving..." : "Save"}
            </Button>
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
