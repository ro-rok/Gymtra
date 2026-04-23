import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Zap, Droplets, Utensils, Flame, TrendingUp, Calendar, Plus, Minus, AlertCircle, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { KpiCard, KpiCardSkeletonGrid } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  getMemberDashboardAttendanceTasksRequest,
  upsertDailyTasksRequest,
} from "@/lib/attendance-api";
import { listMembershipsRequest } from "@/lib/membership-api";
import { getISTDateString } from "@/lib/datetime";

const Task = ({ icon: Icon, label, hint, done, onToggle, disabled }: any) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={cn(
      "group w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all hover-lift disabled:opacity-60 disabled:cursor-not-allowed",
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
  const today = getISTDateString();
  const memberId = user?.id || "";
  const [membership, setMembership] = useState<any | null>(null);
  useEffect(() => {
    listMembershipsRequest()
      .then((rows) => setMembership(rows.find((row) => row.memberId === memberId) || null))
      .catch(() => setMembership(null));
  }, [memberId]);

  const [existing, setExisting] = useState<any | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [absence30, setAbsence30] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    getMemberDashboardAttendanceTasksRequest()
      .then((data) => {
        setExisting(data.todayTasks);
        setAttendance(data.attendance);
        setStreak(data.stats.streak);
        setAbsence30(data.stats.absentDays30);
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reloadKey]);

  const [tasks, setTasks] = useState({
    workout: false,
    meal: false,
    water: false,
  });
  const [waterLiters, setWaterLiters] = useState(0);

  useEffect(() => {
    if (!existing) {
      setTasks({ workout: false, meal: false, water: false });
      setWaterLiters(0);
      return;
    }
    setTasks({
      workout: Boolean(existing.workout),
      meal: Boolean(existing.meal),
      water: Boolean(existing.water),
    });
    setWaterLiters(Number(existing.waterLiters || 0));
  }, [existing]);

  const persistTasks = (updatedTasks: typeof tasks, liters: number) => {
    setSaveState("saving");
    upsertDailyTasksRequest({ date: today, ...updatedTasks, waterLiters: liters })
      .then(() => {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1200);
      })
      .catch(() => {
        setSaveState("error");
      });
  };

  const toggle = (k: keyof typeof tasks) => {
    if (isLoading) return;
    const updated = { ...tasks, [k]: !tasks[k] };
    setTasks(updated);
    persistTasks(updated, waterLiters);
  };

  const adjustWater = (delta: number) => {
    if (isLoading) return;
    const newLiters = Math.max(0, Number((waterLiters + delta).toFixed(1)));
    setWaterLiters(newLiters);
    const isWaterDone = newLiters > 0;
    const updated = { ...tasks, water: isWaterDone };
    setTasks(updated);
    persistTasks(updated, newLiters);
  };

  const done = Object.values(tasks).filter(Boolean).length;
  const pct = Math.round((done / 3) * 100);
  const checkedInToday = attendance.some((a) => a.date === today && a.status === "present");
  const presentSessions = attendance.filter((a) => a.status === "present").length;

  return (
    <>
      <PageHeader
        title={`Today, ${user?.name?.split(" ")[0] || "Member"}`}
        subtitle="Complete today's essentials and keep your streak alive."
        action={
          <>
            <Link to={`/${gymSlug}/member/checkin`}><Button size="sm">Check in</Button></Link>
            <Link to={`/${gymSlug}/member/diet`}><Button size="sm" variant="outline">View diet</Button></Link>
          </>
        }
      />

      {hasError && !isLoading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Unable to load today's dashboard</div>
            <div className="text-xs text-muted-foreground">Retry to fetch today's attendance and task progress.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
        </div>
      )}

      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 md:p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-1.5">Daily status</h1>
          <p className="text-secondary-foreground/70 text-sm mt-2">
            {isLoading ? "Loading your daily status..." : `${done}/3 tasks complete · ${streak}-day streak`}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{checkedInToday ? "Checked in today" : "Check-in pending"}</span>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5" />
              <span>{tasks.meal ? "Diet task complete" : "Diet task pending"}</span>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              <span>{tasks.workout ? "Workout complete" : "Workout pending"}</span>
            </div>
          </div>

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

      {isLoading ? (
        <KpiCardSkeletonGrid count={3} className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 mb-4" />
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <KpiCard label="Streak" value={streak} hint="days" icon={Flame} accent="warning" />
          <KpiCard label="Sessions" value={presentSessions} hint="present" icon={TrendingUp} accent="primary" />
          <KpiCard label="Plan ends" value={membership?.expiryDate?.slice(5) || "—"} icon={Calendar} accent="accent" animated={false} />
        </div>
      )}
      <div className="text-xs text-muted-foreground mb-4">Absent days in last 30 days: {absence30}</div>

      <div className="text-xs mb-4 transition-all">
        {saveState === "saving" && <span className="text-muted-foreground">Saving updates...</span>}
        {saveState === "saved" && <span className="text-success">Saved</span>}
        {saveState === "error" && <span className="text-destructive">Could not save. Try again.</span>}
      </div>

      <h2 className="text-lg font-display font-semibold mb-3">Today's checklist</h2>
      {isLoading ? (
        <div className="space-y-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`member-task-skeleton-${i}`} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          <Task icon={Zap} label="Workout complete" hint="Mark when your training session is done." done={tasks.workout} onToggle={() => toggle("workout")} disabled={isLoading} />
          <Task icon={Utensils} label="Diet complete" hint="Mark once your planned meals are done." done={tasks.meal} onToggle={() => toggle("meal")} disabled={isLoading} />

          <div className={cn(
            "rounded-2xl border p-4 transition-all",
            tasks.water ? "border-primary bg-primary/5" : "border-border bg-card"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                tasks.water ? "bg-primary text-primary-foreground" : "bg-accent/10 text-accent"
              )}>
                <Droplets className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Water log</div>
                <div className="text-xs text-muted-foreground">{waterLiters.toFixed(1)}L logged today</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => adjustWater(-0.25)} disabled={isLoading || waterLiters <= 0}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="w-12 text-center font-display font-bold text-sm tabular-nums">{waterLiters.toFixed(1)}L</span>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => adjustWater(0.25)} disabled={isLoading}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", tasks.water ? "bg-primary" : "bg-accent")}
                style={{ width: `${Math.min(100, waterLiters * 20)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {!isLoading && !hasError && !existing && done === 0 && (
        <div className="mb-6">
          <EmptyState
            icon={CalendarCheck}
            title="Start your daily momentum"
            description="No tasks are logged for today yet."
            secondaryHint="Check in first, then complete workout and diet tasks."
            action={<Link to={`/${gymSlug}/member/checkin`}><Button size="sm">Check in now</Button></Link>}
            variant="embedded"
            className="p-6"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to={`/${gymSlug}/member/checkin`}><Button className="w-full h-12 text-base gap-2"><Zap className="w-5 h-5" /> Check in</Button></Link>
        <Link to={`/${gymSlug}/member/diet`}><Button variant="outline" className="w-full h-12 text-base gap-2"><Utensils className="w-5 h-5" /> View diet</Button></Link>
      </div>
    </>
  );
};

export default MemberDashboard;
