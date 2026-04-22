import { Plus, Salad } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createDietTemplateRequest, listDietTemplatesRequest } from "@/lib/diet-api";
import type { DietTemplate } from "@/lib/types";

const DietTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const gymId = user?.gymId || "1";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "loss" as "loss" | "gain" | "maintain",
    calories: "",
    meals: "4",
    tags: "",
    notes: "",
    preferenceTags: "",
    allergyTags: "",
    protein: "",
    carbs: "",
    fat: "",
    mealPlan: [{ time: "", name: "", cal: "", macros: "" }],
  });
  const [templates, setTemplates] = useState<DietTemplate[]>([]);

  useEffect(() => {
    listDietTemplatesRequest().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const handleAdd = async () => {
    await createDietTemplateRequest({
      gymId, name: form.name, goal: form.goal, calories: Number(form.calories),
      meals: Number(form.meals), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      notes: form.notes || undefined,
      preferenceTags: form.preferenceTags.split(",").map(t => t.trim()).filter(Boolean),
      allergyTags: form.allergyTags.split(",").map(t => t.trim()).filter(Boolean),
      macros: {
        protein: form.protein ? Number(form.protein) : undefined,
        carbs: form.carbs ? Number(form.carbs) : undefined,
        fat: form.fat ? Number(form.fat) : undefined,
      },
      mealPlan: form.mealPlan
        .filter((m) => m.time && m.name)
        .map((m) => ({ time: m.time, name: m.name, cal: Number(m.cal || 0), macros: m.macros })),
      createdBy: user?.id || "",
    });
    const latest = await listDietTemplatesRequest();
    setTemplates(latest);
    toast({ title: "Diet template created" });
    setShowForm(false);
    setForm({
      name: "", goal: "loss", calories: "", meals: "4", tags: "", notes: "", preferenceTags: "", allergyTags: "",
      protein: "", carbs: "", fat: "", mealPlan: [{ time: "", name: "", cal: "", macros: "" }],
    });
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
          <div><Label>Notes</Label><Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="General instructions" /></div>
          <div><Label>Preference tags</Label><Input className="mt-1" value={form.preferenceTags} onChange={e => setForm({ ...form, preferenceTags: e.target.value })} placeholder="veg, jain" /></div>
          <div><Label>Allergy tags</Label><Input className="mt-1" value={form.allergyTags} onChange={e => setForm({ ...form, allergyTags: e.target.value })} placeholder="nuts, lactose" /></div>
          <div><Label>Protein (g)</Label><Input className="mt-1" type="number" value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} /></div>
          <div><Label>Carbs (g)</Label><Input className="mt-1" type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} /></div>
          <div><Label>Fat (g)</Label><Input className="mt-1" type="number" value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} /></div>
          <div className="sm:col-span-3">
            <Label>Meal plan</Label>
            <div className="mt-2 space-y-2">
              {form.mealPlan.map((meal, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2">
                  <Input placeholder="Time" value={meal.time} onChange={(e) => setForm({ ...form, mealPlan: form.mealPlan.map((m, i) => i === idx ? { ...m, time: e.target.value } : m) })} />
                  <Input placeholder="Meal name" value={meal.name} onChange={(e) => setForm({ ...form, mealPlan: form.mealPlan.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) })} />
                  <Input placeholder="Calories" type="number" value={meal.cal} onChange={(e) => setForm({ ...form, mealPlan: form.mealPlan.map((m, i) => i === idx ? { ...m, cal: e.target.value } : m) })} />
                  <Input placeholder="Macros text" value={meal.macros} onChange={(e) => setForm({ ...form, mealPlan: form.mealPlan.map((m, i) => i === idx ? { ...m, macros: e.target.value } : m) })} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, mealPlan: [...form.mealPlan, { time: "", name: "", cal: "", macros: "" }] })}>Add meal row</Button>
            </div>
          </div>
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
