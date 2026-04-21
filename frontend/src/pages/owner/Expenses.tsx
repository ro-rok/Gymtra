import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getExpenses, addExpense } from "@/lib/data-service";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseCategory } from "@/lib/types";

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const gymId = user?.gymId || "1";
  const [, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Misc" as ExpenseCategory, amount: "", date: new Date().toISOString().split("T")[0], recurring: false });
  const allExpenses = getExpenses(gymId);
  const total = allExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    addExpense({ gymId, category: form.category, amount: Number(form.amount), date: form.date, recurring: form.recurring });
    toast({ title: "Expense added" });
    setShowForm(false);
    setForm({ category: "Misc", amount: "", date: new Date().toISOString().split("T")[0], recurring: false });
    setRefresh(n => n + 1);
  };

  return (
    <>
      <PageHeader title="Expenses" subtitle="Track rent, utilities, and ops costs."
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> Add Expense</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-3">
          <div><Label>Category</Label><Input className="mt-1" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ExpenseCategory })} placeholder="Rent, Electricity…" /></div>
          <div><Label>Amount (₹)</Label><Input className="mt-1" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Date</Label><Input className="mt-1" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={handleAdd} disabled={!form.amount}>Save</Button></div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total" value={`₹${total.toLocaleString("en-IN")}`} icon={Receipt} accent="accent" />
        <KpiCard label="Recurring" value={allExpenses.filter(e => e.recurring).length} icon={Receipt} accent="primary" />
        <KpiCard label="One-off" value={allExpenses.filter(e => !e.recurring).length} icon={Receipt} accent="warning" />
        <KpiCard label="Avg / day" value={`₹${Math.round(total / 30).toLocaleString("en-IN")}`} icon={Receipt} accent="success" />
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th><th className="text-right px-4 py-3">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allExpenses.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{e.recurring ? "Recurring" : "One-off"}</span></td>
                <td className="px-4 py-3 text-right font-display font-semibold">₹{e.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
export default Expenses;
