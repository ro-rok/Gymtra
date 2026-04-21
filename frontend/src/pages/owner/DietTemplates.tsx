import { Plus, Salad } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDietTemplates, createDietTemplate } from "@/lib/data-service";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const DietTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const gymId = user?.gymId || "1";
  const [, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "loss" as "loss" | "gain" | "maintain", calories: "", meals: "4", tags: "" });
  const templates = getDietTemplates(gymId);

  const handleAdd = () => {
    createDietTemplate({
      gymId, name: form.name, goal: form.goal, calories: Number(form.calories),
      meals: Number(form.meals), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdBy: user?.id || "",
    });
    toast({ title: "Diet template created" });
    setShowForm(false);
    setForm({ name: "", goal: "loss", calories: "", meals: "4", tags: "" });
    setRefresh(n => n + 1);
  };

  return (
    <>
      <PageHeader title="Diet Templates" subtitle="Reusable plans for weight loss & gain."
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> New Template</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-3 gap-3">
          <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Goal</Label><Input className="mt-1" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value as any })} placeholder="loss / gain / maintain" /></div>
          <div><Label>Calories</Label><Input className="mt-1" type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} /></div>
          <div><Label>Meals/day</Label><Input className="mt-1" type="number" value={form.meals} onChange={e => setForm({ ...form, meals: e.target.value })} /></div>
          <div><Label>Tags (comma-sep)</Label><Input className="mt-1" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="veg, high-protein" /></div>
          <div className="flex items-end"><Button onClick={handleAdd} disabled={!form.name}>Save</Button></div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Salad className="w-5 h-5" /></div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.goal === "loss" ? "bg-accent/10 text-accent" : d.goal === "gain" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                {d.goal}
              </span>
            </div>
            <div className="font-display font-semibold">{d.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{d.calories} kcal · {d.meals} meals</div>
            <div className="flex flex-wrap gap-1 mt-3">
              {d.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
export default DietTemplates;
