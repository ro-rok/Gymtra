import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useParams } from "react-router-dom";
import { Salad, Sparkles, Flame, Beef, Wheat, Droplets, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { getMemberMealPlanRequest, type MemberMealPlan } from "@/lib/diet-api";
import type { DietTemplate } from "@/lib/types";
import { IST_WEEKDAY_NAMES, getISTWeekday } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const parseMacros = (s: string) => {
  const p = /P(\d+)/.exec(s)?.[1];
  const c = /C(\d+)/.exec(s)?.[1];
  const f = /F(\d+)/.exec(s)?.[1];
  return { p: Number(p || 0), c: Number(c || 0), f: Number(f || 0) };
};

const MacroChip = ({ icon: Icon, label, value, color }: { icon: typeof Beef; label: string; value: number; color: string }) => (
  <div className="flex-1 rounded-xl border border-border bg-card p-3">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="font-display font-bold text-lg tabular-nums">
      {value}
      <span className="text-xs font-normal text-muted-foreground">g</span>
    </div>
  </div>
);

const DietPlanBlock = ({
  template,
  title,
  description,
}: {
  template: DietTemplate;
  title: string;
  description?: string;
}) => {
  const meals = template.mealPlan || [];
  const totalCal = meals.reduce((s, m) => s + m.cal, 0);
  const target = template.calories || totalCal;
  const pct = target > 0 ? Math.min(100, Math.round((totalCal / target) * 100)) : 0;
  const totals = meals.reduce(
    (acc, m) => {
      const { p, c, f } = parseMacros(m.macros);
      return { p: acc.p + p, c: acc.c + c, f: acc.f + f };
    },
    { p: 0, c: 0, f: 0 },
  );
  const macroSource = template.macros;
  const displayP = macroSource?.protein ?? totals.p;
  const displayC = macroSource?.carbs ?? totals.c;
  const displayF = macroSource?.fat ?? totals.f;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
      </div>

      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="relative">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">Daily target</div>
              <div className="font-display text-3xl font-bold mt-1 tabular-nums">
                {totalCal}
                <span className="text-sm font-normal text-secondary-foreground/60"> / {target} kcal</span>
              </div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-secondary-foreground/60 font-semibold">Plan</div>
              <div className="font-display font-bold text-sm truncate">{template.name}</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          {template.notes ? (
            <p className="text-[11px] text-secondary-foreground/70 mt-2">{template.notes}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MacroChip icon={Beef} label="Protein" value={Math.round(displayP)} color="bg-primary/10 text-primary" />
        <MacroChip icon={Wheat} label="Carbs" value={Math.round(displayC)} color="bg-warning/15 text-warning" />
        <MacroChip icon={Droplets} label="Fat" value={Math.round(displayF)} color="bg-accent/10 text-accent" />
      </div>

      <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground">Meal schedule</h3>
      <div className="space-y-3">
        {meals.map((m, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover-lift">
            <div className="w-14 text-center shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {m.time.split(" ").slice(1).join(" ") || "AM"}
              </div>
              <div className="font-display font-bold text-lg">{m.time.split(" ")[0]}</div>
            </div>
            <div className="w-px self-stretch bg-border" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Flame className="w-3 h-3 text-warning" /> {m.cal} kcal
                </span>
                <span className="text-border">·</span>
                <span>{m.macros}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MemberDiet = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<MemberMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getISTWeekday());

  useEffect(() => {
    setLoading(true);
    getMemberMealPlanRequest()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const todayIdx = getISTWeekday();
  const selectedTemplate =
    plan?.weeklyRecommended.find((t) => t.weekday === selectedDay) ||
    (selectedDay === todayIdx ? plan?.todayRecommended : null);

  const goalBadgeStatus =
    plan?.nutritionGoal === "loss" ? "warning" : plan?.nutritionGoal === "gain" ? "healthy" : "active";

  return (
    <>
      <PageHeader
        title="Your meal plan"
        subtitle="Vegetarian plans matched to your weight goal"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground py-8">Loading your meal plan…</p>
      ) : !plan ? (
        <p className="text-sm text-muted-foreground py-8">Unable to load meal plan. Try again later.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Your nutrition goal</div>
                  <div className="text-xs text-muted-foreground">
                    Based on current vs target weight
                  </div>
                </div>
              </div>
              <StatusBadge status={goalBadgeStatus} />
            </div>
            <div className="text-sm">
              <span className="font-medium">{plan.nutritionGoalLabel}</span>
              {plan.currentWeightKg != null && plan.goalWeightKg != null ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {plan.currentWeightKg} kg now → {plan.goalWeightKg} kg goal
                </span>
              ) : (
                <span className="text-muted-foreground block mt-1 text-xs">
                  Add current and goal weight in your{" "}
                  <Link to={`/${gymSlug}/member/profile`} className="text-primary hover:underline">
                    profile
                  </Link>{" "}
                  for a personalized goal.
                </span>
              )}
            </div>
          </div>

          {plan.assignedTemplate ? (
            <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <DietPlanBlock
                template={plan.assignedTemplate}
                title="Trainer assigned plan"
                description="Your coach picked this plan for you."
              />
            </div>
          ) : null}

          {plan.todayRecommended ? (
            <div className="mb-8">
              <DietPlanBlock
                template={plan.todayRecommended}
                title={`Recommended for today (${IST_WEEKDAY_NAMES[todayIdx]})`}
                description="Matched to your goal. All members can follow these vegetarian meals."
              />
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No recommended plan for today yet. Ask your gym to seed the weekly vegetarian library.
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Full week ({plan.nutritionGoalLabel})
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {IST_WEEKDAY_NAMES.map((day, idx) => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={selectedDay === idx ? "default" : "outline"}
                  className={cn("shrink-0", idx === todayIdx && selectedDay !== idx && "border-primary/40")}
                  onClick={() => setSelectedDay(idx)}
                >
                  {day.slice(0, 3)}
                  {idx === todayIdx ? " ·" : ""}
                </Button>
              ))}
            </div>
          </div>

          {selectedTemplate ? (
            <DietPlanBlock
              template={selectedTemplate}
              title={IST_WEEKDAY_NAMES[selectedDay]}
              description={`${selectedTemplate.calories} kcal · ${selectedTemplate.meals} meals`}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No plan for {IST_WEEKDAY_NAMES[selectedDay]} with your current goal.
            </div>
          )}

          {!plan.assignedTemplate && !plan.todayRecommended && plan.weeklyRecommended.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Want a personalized plan?</div>
                <div className="text-xs text-muted-foreground">
                  Your gym can assign a custom template, or run the weekly vegetarian diet seed.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MemberDiet;
