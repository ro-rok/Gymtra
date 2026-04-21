import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Zap, Droplets, Utensils, Flame, TrendingUp, Calendar, Plus, Minus, PartyPopper } from "lucide-react";
import { Link } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Confetti } from "@/components/Confetti";
import {
  getDailyTasks, saveDailyTasks, getTaskStreak,
  getMemberMembership, getMemberAttendance, logWaterIntake
} from "@/lib/data-service";

const Task = ({ icon: Icon, label, hint, done, onToggle }: any) => (
  <button
    onClick={onToggle}
    className={cn(
      "group w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all hover-lift",
      done ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
    )}
  >
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
      done ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
    )}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
    <div className={cn(
      "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
      done ? "bg-primary border-primary text-primary-foreground animate-celebrate" : "border-border"
    )}>
      {done && "✓"}
    </div>
  </button>
);

const MemberDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const memberId = user?.id === "u-member-1" ? "m1" : user?.id || "";
  const gymId = user?.gymId || "1";

  const existing = getDailyTasks(memberId, today);
  const [tasks, setTasks] = useState({
    workout: existing?.workout || false,
    meal: existing?.meal || false,
    water: existing?.water || false,
  });
  const [waterLiters, setWaterLiters] = useState(existing?.waterLiters || 0);
  const [celebrate, setCelebrate] = useState(false);

  const toggle = (k: keyof typeof tasks) => {
    const updated = { ...tasks, [k]: !tasks[k] };
    setTasks(updated);
    saveDailyTasks({ memberId, gymId, date: today, ...updated, waterLiters });
    if (updated.workout && updated.meal && updated.water && !(tasks.workout && tasks.meal && tasks.water)) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 100);
    }
  };

  const adjustWater = (delta: number) => {
    const newLiters = Math.max(0, Number((waterLiters + delta).toFixed(1)));
    setWaterLiters(newLiters);
    const isWaterDone = newLiters >= 2.5;
    const updated = { ...tasks, water: isWaterDone };
    setTasks(updated);
    saveDailyTasks({ memberId, gymId, date: today, ...updated, waterLiters: newLiters });
  };

  const done = Object.values(tasks).filter(Boolean).length;
  const pct = Math.round((done / 3) * 100);
  const streak = getTaskStreak(memberId);
  const membership = getMemberMembership(memberId);
  const attendance = getMemberAttendance(memberId);

  return (
    <>
      <Confetti trigger={celebrate} />

      {/* Hero greeting */}
      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 md:p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-1.5">
            Let's go, {user?.name?.split(" ")[0] || "Champ"} <span className="inline-block animate-float">🔥</span>
          </h1>
          <p className="text-secondary-foreground/70 text-sm mt-2">
            {done === 3 ? "You crushed today! 🎉" : `${done}/3 tasks done · ${streak}-day streak`}
          </p>

          {/* Progress bar */}
          <div className="mt-5 max-w-sm">
            <div className="flex items-center justify-between text-xs text-secondary-foreground/60 mb-1.5">
              <span>Today's progress</span>
              <span className="font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard label="Streak" value={streak} hint="days" icon={Flame} accent="warning" />
        <KpiCard label="Sessions" value={attendance.length} hint="total" icon={TrendingUp} accent="primary" />
        <KpiCard label="Plan ends" value={membership?.expiryDate?.slice(5) || "—"} icon={Calendar} accent="accent" animated={false} />
      </div>

      <h2 className="text-lg font-display font-semibold mb-3">Today's check-list</h2>
      <div className="space-y-3 mb-6">
        <Task icon={Zap} label="Did you complete your workout?" hint="60 min · push day" done={tasks.workout} onToggle={() => toggle("workout")} />
        <Task icon={Utensils} label="Did you eat your planned meals?" hint="5 meals · 1,800 kcal" done={tasks.meal} onToggle={() => toggle("meal")} />

        {/* Water with quick log */}
        <div className={cn(
          "rounded-2xl border p-4 transition-all",
          tasks.water ? "border-primary bg-primary/5" : "border-border bg-card"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              tasks.water ? "bg-primary text-primary-foreground" : "bg-accent/10 text-accent"
            )}>
              <Droplets className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Water intake</div>
              <div className="text-xs text-muted-foreground">{waterLiters.toFixed(1)}L of 2.5L target</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => adjustWater(-0.25)} disabled={waterLiters <= 0}>
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="w-12 text-center font-display font-bold text-sm tabular-nums">{waterLiters.toFixed(1)}L</span>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => adjustWater(0.25)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", tasks.water ? "bg-primary" : "bg-accent")}
              style={{ width: `${Math.min(100, (waterLiters / 2.5) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Celebration banner */}
      {done === 3 && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 mb-6 flex items-center gap-4 animate-scale-in">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center animate-celebrate">
            <PartyPopper className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display font-bold">Day complete! 🎉</div>
            <div className="text-sm text-muted-foreground">{streak + (existing?.workout && existing?.meal && existing?.water ? 0 : 1)}-day streak. Keep it rolling tomorrow.</div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to={`/${gymSlug}/member/checkin`}><Button className="w-full h-12 text-base gap-2"><Zap className="w-5 h-5" /> Check in to gym</Button></Link>
        <Link to={`/${gymSlug}/member/diet`}><Button variant="outline" className="w-full h-12 text-base gap-2"><Utensils className="w-5 h-5" /> Today's meals</Button></Link>
      </div>
    </>
  );
};

export default MemberDashboard;
