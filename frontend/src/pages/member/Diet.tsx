import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { todayMeals } from "@/lib/mock-data";
import { Salad, Sparkles, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { useEffect, useState } from "react";
import { getMemberActiveDietRequest } from "@/lib/diet-api";
import type { DietTemplate } from "@/lib/types";

const parseMacros = (s: string) => {
  const p = /P(\d+)/.exec(s)?.[1];
  const c = /C(\d+)/.exec(s)?.[1];
  const f = /F(\d+)/.exec(s)?.[1];
  return { p: Number(p || 0), c: Number(c || 0), f: Number(f || 0) };
};

const MacroChip = ({ icon: Icon, label, value, color }: any) => (
  <div className="flex-1 rounded-xl border border-border bg-card p-3">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="font-display font-bold text-lg tabular-nums">{value}<span className="text-xs font-normal text-muted-foreground">g</span></div>
  </div>
);

const MemberDiet = () => {
  const { user } = useAuth();
  const [template, setTemplate] = useState<DietTemplate | null>(null);
  useEffect(() => {
    getMemberActiveDietRequest().then((data) => setTemplate(data.template)).catch(() => setTemplate(null));
  }, []);
  const meals = template?.mealPlan || todayMeals;
  const totalCal = meals.reduce((s, m) => s + m.cal, 0);
  const target = template?.calories || totalCal;
  const pct = Math.min(100, Math.round((totalCal / target) * 100));
  const totals = meals.reduce((acc, m) => {
    const { p, c, f } = parseMacros(m.macros);
    return { p: acc.p + p, c: acc.c + c, f: acc.f + f };
  }, { p: 0, c: 0, f: 0 });

  return (
    <>
      <PageHeader
        title="Today's Meals"
        subtitle={template ? `${template.name} · ${template.calories} kcal target` : "Default plan · ask your trainer for a custom one"}
      />

      {/* Daily summary card */}
      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">Today's intake</div>
              <div className="font-display text-4xl font-bold mt-1.5 tabular-nums">{totalCal}<span className="text-base font-normal text-secondary-foreground/60"> / {target} kcal</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-secondary-foreground/60 font-semibold">Plan</div>
              <div className="font-display font-bold text-sm">{template?.name || "Default"}</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] text-secondary-foreground/60 mt-1.5 flex justify-between">
            <span>{meals.length} meals planned</span>
            <span>{pct}% of target</span>
          </div>
        </div>
      </div>

      {/* Macro chips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MacroChip icon={Beef} label="Protein" value={totals.p} color="bg-primary/10 text-primary" />
        <MacroChip icon={Wheat} label="Carbs" value={totals.c} color="bg-warning/15 text-warning" />
        <MacroChip icon={Droplets} label="Fat" value={totals.f} color="bg-accent/10 text-accent" />
      </div>

      <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">Meal schedule</h2>
      <div className="space-y-3">
        {meals.map((m, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover-lift">
            <div className="w-14 text-center shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.time.split(" ")[1]}</div>
              <div className="font-display font-bold text-lg">{m.time.split(" ")[0]}</div>
            </div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{m.name}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-warning" /> {m.cal} kcal</span>
                <span className="text-border">·</span>
                <span>{m.macros}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!template && (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">Want a personalized plan?</div>
            <div className="text-xs text-muted-foreground">Ask your trainer to assign a diet template that matches your goals and allergies.</div>
          </div>
        </div>
      )}
    </>
  );
};
export default MemberDiet;
