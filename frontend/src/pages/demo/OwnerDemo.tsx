import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GuidedOverlayRoot } from "@/components/guided-overlay/GuidedOverlayRoot";
import { initDemoState, subscribeDemoState, getDemoState, updateDemoState } from "@/lib/demo-store";
import type { DemoDataset } from "@/lib/demoData";
import { useToast } from "@/hooks/use-toast";
import { hasSeenDemoAny, markDemoSeen, setLastAction } from "@/lib/onboarding-state";
import { track } from "@/lib/tracking";
import { EASING, UI_TIMING } from "@/lib/ui-timing";

const steps = [
  { id: "s1", targetId: "demo-add-member", title: "Add your first member", description: "Start here. Everything builds from this." },
  { id: "s2", targetId: "demo-mark-checkin", title: "Track attendance instantly", description: "One tap records activity. Your dashboard updates." },
  { id: "s3", targetId: "demo-tasks", title: "See what needs action", description: "Missed visits and renewals stay tracked automatically." },
  { id: "s4", targetId: "demo-cta", title: "You're in control", description: "Everything stays updated in real time.", ctaLabel: "Finish" },
] as const;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const quickActions = [
  {
    id: "add-member",
    title: "Add your first member",
    detail: "Start your workflow in one step.",
  },
  {
    id: "mark-checkin",
    title: "Simulate today's check-in",
    detail: "Attendance updates in real time.",
  },
  {
    id: "review-renewals",
    title: "Review renewal attention",
    detail: "See who needs follow-up now.",
  },
];

const OwnerDemo = () => {
  const { gymSlug = "star-fitness" } = useParams();
  const { toast } = useToast();
  const [state, setState] = useState<DemoDataset>(() => initDemoState(gymSlug));
  const [bootstrapping, setBootstrapping] = useState(true);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [recentlyCheckedIn, setRecentlyCheckedIn] = useState(false);
  const [recentlyUpdatedTaskId, setRecentlyUpdatedTaskId] = useState<string | null>(null);
  const [errorPulse, setErrorPulse] = useState(false);
  const [optimisticMember, setOptimisticMember] = useState<{ id: string; name: string; isPending: boolean } | null>(null);
  const [showSetupCta, setShowSetupCta] = useState(() => window.sessionStorage.getItem(`demo-overlay:${gymSlug}`) === "done");
  const [showConversionInline, setShowConversionInline] = useState(false);
  const [liveKpi, setLiveKpi] = useState({ members: 0, checkins: 0, renewals: 0 });
  const [busyAction, setBusyAction] = useState<"member" | "checkin" | null>(null);
  const [interactionCount, setInteractionCount] = useState(0);
  const [repeatedActionCount, setRepeatedActionCount] = useState(0);
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [nextSuggestion, setNextSuggestion] = useState("Next: Add your first member");
  const [confidenceMessage, setConfidenceMessage] = useState<string | null>(null);
  const [highlightActionId, setHighlightActionId] = useState<string>("add-member");
  const [isExperiencedDemoUser, setIsExperiencedDemoUser] = useState(false);
  const conversionShownRef = useRef(false);
  const isMountedRef = useRef(false);
  const liveKpiRef = useRef(liveKpi);
  const lastInteractionAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const initialized = initDemoState(gymSlug);
    setState(initialized);
    setIsExperiencedDemoUser(hasSeenDemoAny());
    markDemoSeen(gymSlug);
    track("demo_started", { gymSlug });
    setBootstrapping(true);
    const readyTimer = window.setTimeout(() => setBootstrapping(false), UI_TIMING.overlayEnterMs);
    const unsub = subscribeDemoState(() => {
      const next = getDemoState();
      if (next) setState(next);
    });
    return () => {
      window.clearTimeout(readyTimer);
      unsub();
    };
  }, [gymSlug]);

  useEffect(() => {
    const onScroll = () => {
      lastInteractionAtRef.current = Date.now();
      maybeShowConversion("scroll_boost");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showConversionWithDelay = () => {
    if (conversionShownRef.current) return;
    conversionShownRef.current = true;
    const delay = UI_TIMING.overlayEnterMs + UI_TIMING.demo.overlayAdvanceMs + UI_TIMING.overlayEnterMs;
    window.setTimeout(() => setShowConversionInline(true), delay);
  };

  const maybeShowConversion = (reason: "engagement" | "final_step" | "pause_boost" | "scroll_boost" | "repeat_boost") => {
    if (reason === "final_step" || interactionCount >= 2 || reason === "scroll_boost" || repeatedActionCount > 0) {
      showConversionWithDelay();
      return;
    }
    if (Date.now() - lastInteractionAtRef.current > 2500) {
      showConversionWithDelay();
    }
  };

  useEffect(() => {
    liveKpiRef.current = liveKpi;
  }, [liveKpi]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = state.attendance.filter((a) => a.date === today);
  const activeMembers = state.members.filter((m) => m.status === "active").length + (optimisticMember ? 1 : 0);
  const pendingRenewal = state.members.filter((m) => m.status === "pending_renewal" || m.status === "expired").length;

  useEffect(() => {
    const target = {
      members: state.members.length + (optimisticMember ? 1 : 0),
      checkins: todayAttendance.length,
      renewals: pendingRenewal,
    };
    if (!isMountedRef.current) {
      setLiveKpi(target);
      isMountedRef.current = true;
      return;
    }
    const start = performance.now();
    const base = liveKpiRef.current;
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / UI_TIMING.demo.kpiCountMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setLiveKpi({
        members: Math.round(base.members + (target.members - base.members) * eased),
        checkins: Math.round(base.checkins + (target.checkins - base.checkins) * eased),
        renewals: Math.round(base.renewals + (target.renewals - base.renewals) * eased),
      });
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [optimisticMember, pendingRenewal, state.members.length, todayAttendance.length]);

  const addMember = async () => {
    lastInteractionAtRef.current = Date.now();
    const optimisticId = `optimistic-${Date.now()}`;
    setOptimisticMember({ id: optimisticId, name: "New Walk-in Member", isPending: true });
    setBusyAction("member");
    await wait(UI_TIMING.demo.addMemberMs);
    const id = `demo-member-${Date.now()}`;
    updateDemoState((current) => ({
      ...current,
      members: [
        {
          id,
          gymId: current.gym.id,
          name: "New Walk-in Member",
          email: "walkin@example.com",
          phone: "+919812345678",
          joinDate: today,
          status: "active",
          avatar: "NW",
        },
        ...current.members,
      ],
    }));
    setOptimisticMember(null);
    setRecentlyAddedId(id);
    window.setTimeout(() => setRecentlyAddedId(null), 800);
    track("demo_interaction", { gymSlug, action: "add_member_click" });
    setLastAction(gymSlug, "demo_add_member");
    setNextSuggestion("Next: Mark a check-in.");
    setConfidenceMessage("This member now appears in daily activity.");
    setHighlightActionId("mark-checkin");
    setInteractionCount((count) => count + 1);
    setRepeatedActionCount((count) => (lastActionId === "add-member" ? count + 1 : count));
    setLastActionId("add-member");
    toast({ title: "You're set. First member added.", description: "This member now appears in daily activity." });
    maybeShowConversion("engagement");
    setBusyAction(null);
  };

  const markCheckin = async () => {
    lastInteractionAtRef.current = Date.now();
    setBusyAction("checkin");
    await wait(UI_TIMING.demo.markCheckinMs);
    const target = state.members.find((m) => m.status === "active");
    if (!target) {
      setErrorPulse(true);
      window.setTimeout(() => setErrorPulse(false), UI_TIMING.overlayExitMs);
      toast({ title: "No active member yet", description: "Add a member first, then run check-in.", variant: "destructive" });
      setBusyAction(null);
      return;
    }
    updateDemoState((current) => ({
      ...current,
      attendance: [
        {
          id: `att-${Date.now()}`,
          memberId: target.id,
          gymId: current.gym.id,
          date: today,
          status: "present",
          markedBy: "owner-demo",
          source: "manual",
          trustLevel: "high",
        },
        ...current.attendance,
      ],
    }));
    track("demo_interaction", { gymSlug, action: "mark_checkin_click" });
    setRecentlyCheckedIn(true);
    window.setTimeout(() => setRecentlyCheckedIn(false), 700);
    setLastAction(gymSlug, "demo_mark_checkin");
    setNextSuggestion("Next: Review renewal attention.");
    setConfidenceMessage("Attendance now tracks automatically.");
    setHighlightActionId("review-renewals");
    setInteractionCount((count) => count + 1);
    setRepeatedActionCount((count) => (lastActionId === "mark-checkin" ? count + 1 : count));
    setLastActionId("mark-checkin");
    toast({ title: "Check-in recorded.", description: "Attendance now tracks automatically." });
    maybeShowConversion("engagement");
    setBusyAction(null);
  };

  const runQuickAction = async (actionId: string) => {
    if (actionId === "add-member") {
      await addMember();
      return;
    }
    if (actionId === "mark-checkin") {
      await markCheckin();
      return;
    }
    track("demo_interaction", { gymSlug, action: "review_renewals_hint" });
    setLastAction(gymSlug, "demo_review_attention");
    setNextSuggestion("Next: Create your gym.");
    setConfidenceMessage("Renewal attention updates as activity changes.");
    setHighlightActionId("create-gym");
    setInteractionCount((count) => count + 1);
    maybeShowConversion("engagement");
  };

  return (
    <div className={`min-h-screen bg-background p-3 sm:p-6 ${errorPulse ? "feedback-error-shake" : ""}`}>
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium sm:px-4">
          Demo mode. Changes are not saved.
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">{state.gym.name} owner dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {isExperiencedDemoUser ? "Quick tour mode is active." : "Take a guided tour in under two minutes."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              data-tour-id="demo-add-member"
              className={`transition-transform ease-out active:scale-[0.98] ${highlightActionId === "add-member" ? "animate-pulse ring-2 ring-primary/30" : ""}`}
              style={{ transitionDuration: `${UI_TIMING.buttonPressMs}ms`, transitionTimingFunction: EASING.standard }}
              disabled={busyAction !== null}
              onClick={() => void addMember()}
            >
              {busyAction === "member" ? "Adding..." : "Add member"}
            </Button>
            <Button
              data-tour-id="demo-mark-checkin"
              className={`transition-transform ease-out active:scale-[0.98] ${highlightActionId === "mark-checkin" ? "animate-pulse ring-2 ring-primary/30" : ""}`}
              style={{ transitionDuration: `${UI_TIMING.buttonPressMs}ms`, transitionTimingFunction: EASING.standard }}
              variant="outline"
              disabled={busyAction !== null}
              onClick={() => void markCheckin()}
            >
              {busyAction === "checkin" ? "Marking..." : "Mark check-in"}
            </Button>
            <Link to={`/${gymSlug}`}>
              <Button variant="ghost">Back to login</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`rounded-xl border p-4 transition-all animate-in fade-in-0 ${recentlyAddedId ? "feedback-success-flash border-emerald-500/40" : ""}`} style={{ animationDelay: `${UI_TIMING.staggerMs}ms` }}><p className="text-xs text-muted-foreground">Members</p><p className="text-2xl font-semibold">{liveKpi.members}</p></div>
          <div className={`rounded-xl border p-4 transition-all animate-in fade-in-0 ${recentlyCheckedIn ? "feedback-success-flash border-emerald-500/40" : ""}`} style={{ animationDelay: `${UI_TIMING.staggerMs * 2}ms` }}><p className="text-xs text-muted-foreground">Checked in today</p><p className="text-2xl font-semibold">{liveKpi.checkins}</p></div>
          <div className="rounded-xl border p-4 animate-in fade-in-0" style={{ animationDelay: `${UI_TIMING.staggerMs * 3}ms` }}><p className="text-xs text-muted-foreground">Renewal attention</p><p className="text-2xl font-semibold">{liveKpi.renewals}</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold">Start here</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isExperiencedDemoUser ? "Follow this quick sequence." : "Follow this sequence for a clear product tour."}
            </p>
            <div className="mt-3 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Latest members</p>
              <div className="mt-2 space-y-2">
                {bootstrapping ? (
                  <div className="space-y-2 animate-in fade-in-0">
                    <div className="h-9 rounded-md bg-muted shimmer" />
                    <div className="h-9 rounded-md bg-muted shimmer" />
                  </div>
                ) : null}
                {optimisticMember ? (
                  <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm animate-in fade-in-0 slide-in-from-bottom-1">
                    <span className="font-medium">{optimisticMember.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Saving...</span>
                  </div>
                ) : null}
                {!bootstrapping && state.members.slice(0, 2).map((member, index) => (
                  <div
                    key={member.id}
                    className={`rounded-md border px-3 py-2 text-sm transition-all animate-in fade-in-0 slide-in-from-bottom-[6px] ${recentlyAddedId === member.id ? "border-emerald-500/40 bg-emerald-500/10" : ""}`}
                    style={{ transitionDelay: `${index * UI_TIMING.staggerMs}ms` }}
                  >
                    <span className="font-medium">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void runQuickAction(action.id)}
                  className={`interactive-ripple flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all duration-200 hover:bg-muted/40 active:scale-[0.98] ${highlightActionId === action.id ? "border-primary/40 bg-primary/5" : ""}`}
                >
                  <div>
                    <div className="text-sm font-medium">{index + 1}. {action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.detail}</div>
                  </div>
                  <span className="text-xs text-primary font-medium">Run</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{nextSuggestion}</p>
            {confidenceMessage ? <p className="mt-1 text-xs text-muted-foreground animate-in fade-in-0">{confidenceMessage}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">Active members right now: {activeMembers}</p>
          </div>

          <div className="rounded-xl border p-4" data-tour-id="demo-tasks">
            <h2 className="font-semibold">Tasks</h2>
            <div className="mt-3 space-y-2">
              {state.tasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  className={`interactive-ripple flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 hover:bg-muted/40 active:scale-[0.98] ${recentlyUpdatedTaskId === task.id ? "feedback-success-flash border-emerald-500/40" : ""}`}
                  onClick={() => {
                    updateDemoState((current) => ({
                      ...current,
                      tasks: current.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
                    }));
                    setRecentlyUpdatedTaskId(task.id);
                    window.setTimeout(() => setRecentlyUpdatedTaskId(null), 260);
                    track("demo_interaction", { gymSlug, action: "toggle_task", taskId: task.id });
                  }}
                >
                  <span>{task.label}</span>
                  <span className={task.done ? "text-emerald-600" : "text-muted-foreground"}>{task.done ? "Done" : "Pending"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4" data-tour-id="demo-cta">
          <p className="text-sm text-muted-foreground">You just saw how this works.</p>
          <div className="mt-3">
            <Link to={`/${gymSlug}`}>
              <Button variant="outline" className={highlightActionId === "create-gym" ? "animate-pulse ring-2 ring-primary/30" : ""} data-tour-id="create-gym">
                Create your gym
              </Button>
            </Link>
          </div>
        </div>
        {showConversionInline ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 animate-in fade-in-0 slide-in-from-bottom-1">
            <p className="text-sm font-medium">You just saw how this works.</p>
            <p className="mt-1 text-sm text-muted-foreground">Set this up for your gym in under 2 minutes.</p>
            <div className="mt-3">
              <Link to={`/${gymSlug}`}>
                <Button onClick={() => setLastAction(gymSlug, "demo_conversion_click")}>Create your gym</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      {showSetupCta ? (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs rounded-lg border bg-card p-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
          <p className="text-sm font-medium">You're set</p>
          <p className="text-xs text-muted-foreground">Set up your gym with the same guided flow.</p>
        </div>
      ) : null}
      <GuidedOverlayRoot
        sessionKey={`demo-overlay:${gymSlug}`}
        steps={[...steps]}
        onFinish={() => {
          setShowSetupCta(true);
          maybeShowConversion("final_step");
          markDemoSeen(gymSlug);
        }}
      />
    </div>
  );
};

export default OwnerDemo;

