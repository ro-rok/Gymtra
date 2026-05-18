import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Zap,
  Utensils,
  Flame,
  TrendingUp,
  Calendar,
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { KpiCard, KpiCardSkeletonGrid } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { WaterTracker, WATER_GOAL_LITERS } from "@/components/WaterTracker";
import { upsertDailyTasksRequest } from "@/lib/attendance-api";
import { listMembershipsRequest } from "@/lib/membership-api";
import { formatISTLongDate } from "@/lib/datetime";
import { useMemberAttendanceDashboard } from "@/hooks/useMemberAttendanceDashboard";
import { track } from "@/lib/tracking";

const Task = ({
  icon: Icon,
  label,
  hint,
  done,
  onToggle,
  disabled,
}: {
  icon: typeof Zap;
  label: string;
  hint: string;
  done: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={cn(
      "group w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all hover-lift disabled:opacity-60 disabled:cursor-not-allowed min-h-[4.5rem]",
      done ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
    )}
  >
    <div
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
        done ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
      )}
    >
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
    <div
      className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shrink-0",
        done ? "bg-primary border-primary text-primary-foreground animate-celebrate" : "border-border",
      )}
    >
      {done && "✓"}
    </div>
  </button>
);

const CheckInChecklistRow = ({
  done,
  gymSlug,
}: {
  done: boolean;
  gymSlug?: string;
}) => (
  <Link
    to={`/${gymSlug}/member/checkin`}
    className={cn(
      "block rounded-2xl border p-4 transition-all hover-lift min-h-[4.5rem]",
      done ? "border-success/40 bg-success/5" : "border-border bg-card hover:border-primary/40",
    )}
  >
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <CalendarCheck className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">Gym check-in</div>
        <div className="text-xs text-muted-foreground">
          {done ? "You are checked in for today" : "Tap to check in at the gym"}
        </div>
      </div>
      <div
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
          done ? "bg-success border-success text-success-foreground" : "border-border text-muted-foreground",
        )}
      >
        {done ? "✓" : "→"}
      </div>
    </div>
  </Link>
);

const MemberDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const {
    today,
    todayTasks,
    habitStreak,
    absentDays30,
    checkedInToday,
    lastCheckInDate,
    checkInStreak,
    sessionsThisMonth,
    isLoading,
    isError,
    refetch,
  } = useMemberAttendanceDashboard();

  const memberId = user?.id || "";
  const [membership, setMembership] = useState<{ expiryDate?: string } | null>(null);
  const [checkInTimeLabel, setCheckInTimeLabel] = useState<string | null>(null);

  useEffect(() => {
    const visits = Number(localStorage.getItem("gymtra_dashboard_visits") || 0) + 1;
    localStorage.setItem("gymtra_dashboard_visits", String(visits));
  }, []);

  useEffect(() => {
    listMembershipsRequest()
      .then((rows) => setMembership(rows.find((row) => row.memberId === memberId) || null))
      .catch(() => setMembership(null));
  }, [memberId]);

  const [tasks, setTasks] = useState({ workout: false, meal: false, water: false });
  const [waterLiters, setWaterLiters] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!todayTasks) {
      setTasks({ workout: false, meal: false, water: false });
      setWaterLiters(0);
      return;
    }
    setTasks({
      workout: Boolean(todayTasks.workout),
      meal: Boolean(todayTasks.meal),
      water: Boolean(todayTasks.water),
    });
    setWaterLiters(Number(todayTasks.waterLiters || 0));
  }, [todayTasks]);

  useEffect(() => {
    if (checkedInToday) {
      setCheckInTimeLabel(
        new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
      );
    } else {
      setCheckInTimeLabel(null);
    }
  }, [checkedInToday]);

  const persistTasks = (updatedTasks: typeof tasks, liters: number) => {
    setSaveState("saving");
    const waterDone = liters >= WATER_GOAL_LITERS || liters > 0;
    upsertDailyTasksRequest({ date: today, ...updatedTasks, water: waterDone, waterLiters: liters })
      .then(() => {
        setSaveState("saved");
        if (waterDone && liters >= WATER_GOAL_LITERS) {
          track("reminder_completed", { type: "water", liters });
        }
        window.setTimeout(() => setSaveState("idle"), 1200);
        refetch();
      })
      .catch(() => setSaveState("error"));
  };

  const toggle = (k: keyof typeof tasks) => {
    if (isLoading) return;
    const updated = { ...tasks, [k]: !tasks[k] };
    setTasks(updated);
    if (updated[k]) track("reminder_completed", { type: k });
    persistTasks(updated, waterLiters);
  };

  const handleWaterChange = (liters: number) => {
    if (isLoading) return;
    setWaterLiters(liters);
    const updated = { ...tasks, water: liters >= WATER_GOAL_LITERS || liters > 0 };
    setTasks(updated);
    persistTasks(updated, liters);
  };

  const done = Object.values(tasks).filter(Boolean).length;
  const pct = Math.round((done / 3) * 100);

  const lastCheckInLabel = checkedInToday
    ? checkInTimeLabel
      ? `Today at ${checkInTimeLabel}`
      : "Today"
    : lastCheckInDate
      ? formatISTLongDate(new Date(`${lastCheckInDate}T12:00:00`))
      : "No check-ins yet";

  return (
    <>
      <PageHeader
        title={`Today, ${user?.name?.split(" ")[0] || "Member"}`}
        subtitle="Complete today's essentials and keep your streak alive."
        action={
          <>
            <Link to={`/${gymSlug}/member/checkin`}>
              <Button size="sm" className="min-h-10">
                Check in
              </Button>
            </Link>
            <Link to={`/${gymSlug}/member/diet`}>
              <Button size="sm" variant="outline" className="min-h-10">
                View diet
              </Button>
            </Link>
          </>
        }
      />

      {isError && !isLoading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Unable to load today's dashboard</div>
            <div className="text-xs text-muted-foreground">Retry to fetch today's attendance and task progress.</div>
          </div>
          <Button size="sm" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && (
        <div
          className={cn(
            "rounded-2xl border p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3",
            checkedInToday
              ? "border-success/40 bg-success/5"
              : "border-warning/30 bg-warning/5",
          )}
        >
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              checkedInToday ? "bg-success text-success-foreground" : "bg-warning/15 text-warning",
            )}
          >
            {checkedInToday ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold">
              {checkedInToday ? "Checked in today" : "Not checked in yet"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Last check-in: {lastCheckInLabel}
              {checkInStreak > 0 ? ` · ${checkInStreak}-day check-in streak` : ""}
            </div>
          </div>
          {!checkedInToday && (
            <Link to={`/${gymSlug}/member/checkin`} className="w-full sm:w-auto">
              <Button size="sm" className="w-full min-h-10">
                Check in now
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="rounded-3xl gradient-hero text-secondary-foreground p-4 sm:p-6 md:p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60 font-bold">
            {formatISTLongDate()}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-1.5">Daily status</h1>
          <p className="text-secondary-foreground/70 text-sm mt-2">
            {isLoading
              ? "Loading your daily status..."
              : `${done}/3 tasks complete · ${habitStreak}-day habit streak`}
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2 min-h-10">
              <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{checkedInToday ? "Checked in today" : "Check-in pending"}</span>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2 min-h-10">
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              <span>{tasks.meal ? "Diet task complete" : "Diet task pending"}</span>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center gap-2 min-h-10">
              <Zap className="w-3.5 h-3.5 shrink-0" />
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
        <KpiCardSkeletonGrid count={3} className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4" />
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
          <KpiCard label="Habit streak" value={habitStreak} hint="full task days" icon={Flame} accent="warning" />
          <KpiCard label="Check-ins" value={sessionsThisMonth} hint="this month" icon={TrendingUp} accent="primary" />
          <KpiCard label="Plan ends" value={membership?.expiryDate?.slice(5) || "—"} icon={Calendar} accent="accent" animated={false} />
        </div>
      )}
      <div className="text-xs text-muted-foreground mb-4">Absent days in last 30 days: {absentDays30}</div>

      <div className="text-xs mb-4 transition-all min-h-4">
        {saveState === "saving" && <span className="text-muted-foreground">Saving updates...</span>}
        {saveState === "saved" && <span className="text-success">Saved</span>}
        {saveState === "error" && <span className="text-destructive">Could not save. Try again.</span>}
      </div>

      <h2 className="text-lg font-display font-semibold mb-3">Today's checklist</h2>
      {isLoading ? (
        <div className="space-y-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`member-task-skeleton-${i}`} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          <CheckInChecklistRow done={checkedInToday} gymSlug={gymSlug} />
          <Task
            icon={Zap}
            label="Workout complete"
            hint="Mark when your training session is done."
            done={tasks.workout}
            onToggle={() => toggle("workout")}
            disabled={isLoading}
          />
          <Task
            icon={Utensils}
            label="Diet complete"
            hint="Mark once your planned meals are done."
            done={tasks.meal}
            onToggle={() => toggle("meal")}
            disabled={isLoading}
          />
          <WaterTracker liters={waterLiters} onChange={handleWaterChange} disabled={isLoading} isLoading={isLoading} />
        </div>
      )}

      {!isLoading && !isError && !checkedInToday && !todayTasks && done === 0 && (
        <div className="mb-6">
          <EmptyState
            icon={CalendarCheck}
            title="Start your daily momentum"
            description="No tasks are logged for today yet."
            secondaryHint="Check in first, then complete workout and diet tasks."
            action={
              <Link to={`/${gymSlug}/member/checkin`}>
                <Button size="sm" className="min-h-10">
                  Check in now
                </Button>
              </Link>
            }
            variant="embedded"
            className="p-6"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
        <Link to={`/${gymSlug}/member/checkin`}>
          <Button className="w-full h-12 text-base gap-2 min-h-12">
            <Zap className="w-5 h-5" /> Check in
          </Button>
        </Link>
        <Link to={`/${gymSlug}/member/diet`}>
          <Button variant="outline" className="w-full h-12 text-base gap-2 min-h-12">
            <Utensils className="w-5 h-5" /> View diet
          </Button>
        </Link>
      </div>
    </>
  );
};

export default MemberDashboard;
