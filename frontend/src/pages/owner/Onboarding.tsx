import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingLayout } from "@/features/onboarding/OnboardingLayout";
import { StepHeader } from "@/features/onboarding/StepHeader";
import { StepCard } from "@/features/onboarding/StepCard";
import { StepFooter } from "@/features/onboarding/StepFooter";
import {
  getOnboardingState,
  hasCompletedOnboardingAny,
  hasSeenDemoAny,
  markOnboardingCompleted,
  saveOnboardingState,
  setLastAction,
} from "@/lib/onboarding-state";
import { track, trackOnboardingDropoff } from "@/lib/tracking";
import { EASING, UI_TIMING } from "@/lib/ui-timing";
import { updateTenantPricingRequest } from "@/lib/tenant-api";

const TOTAL_STEPS = 4;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const OwnerOnboarding = () => {
  const { gymSlug = "" } = useParams();
  const navigate = useNavigate();
  const saved = useMemo(() => getOnboardingState(gymSlug), [gymSlug]);
  const hasSeenDemo = useMemo(() => hasSeenDemoAny(), []);
  const hasCompletedBefore = useMemo(() => hasCompletedOnboardingAny(), []);
  const reducedGuidance = hasSeenDemo || hasCompletedBefore;
  const transitionMs = hasCompletedBefore ? UI_TIMING.onboarding.stepTransitionMs - UI_TIMING.staggerMs : UI_TIMING.onboarding.stepTransitionMs;

  const [step, setStep] = useState(saved.currentStep || 1);
  const [primingDone, setPrimingDone] = useState(Boolean(saved.startedAt) || (saved.currentStep || 1) > 1);
  const [gymName, setGymName] = useState(saved.gymName || "");
  const [city, setCity] = useState(saved.city || "");
  const [logo, setLogo] = useState(saved.logo || "");
  const [monthly, setMonthly] = useState(String(saved.pricing?.monthly || ""));
  const [quarterly, setQuarterly] = useState(String(saved.pricing?.quarterly || ""));
  const [halfYearly, setHalfYearly] = useState(String(saved.pricing?.halfYearly || ""));
  const [checkinDone, setCheckinDone] = useState(Boolean(saved.checkinSimulated));
  const [error, setError] = useState("");
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSimulatingCheckin, setIsSimulatingCheckin] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [lastCanContinue, setLastCanContinue] = useState(false);
  const [frictionHint, setFrictionHint] = useState("");
  const [focusChurn, setFocusChurn] = useState(0);
  const [recoveryShown, setRecoveryShown] = useState<Record<number, boolean>>({});
  const stepStartedRef = useRef(performance.now());
  const lastInteractionRef = useRef<"input" | "focus" | "cta" | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    track("onboarding_started", { gymSlug, resumedAtStep: saved.currentStep || 1 });
  }, [gymSlug, saved.currentStep]);

  useEffect(() => {
    if (!primingDone) {
      firstInputRef.current?.focus();
    }
  }, [primingDone]);

  useEffect(() => {
    stepStartedRef.current = performance.now();
    setFrictionHint("");
    setFocusChurn(0);
  }, [step]);

  const showFrictionRecovery = (message: string) => {
    if (recoveryShown[step]) return;
    setRecoveryShown((current) => ({ ...current, [step]: true }));
    setFrictionHint(message);
  };

  const resetInactivityWatcher = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      showFrictionRecovery("Only the required fields are needed.");
    }, 3000);
  };

  useEffect(() => {
    if (!primingDone) return;
    resetInactivityWatcher();
    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    };
  }, [primingDone, step]);

  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        trackOnboardingDropoff({
          step,
          timeSpent: Math.round(performance.now() - stepStartedRef.current),
          lastInteraction: lastInteractionRef.current,
        });
      }
    };
  }, [saved.completedAt, step]);

  const registerInputActivity = () => {
    lastInteractionRef.current = "input";
    resetInactivityWatcher();
  };

  const registerFocusActivity = () => {
    lastInteractionRef.current = "focus";
    resetInactivityWatcher();
  };

  const registerCtaActivity = () => {
    lastInteractionRef.current = "cta";
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    saveOnboardingState(gymSlug, {
      startedAt: saved.startedAt || new Date().toISOString(),
      currentStep: nextStep,
      gymName,
      city,
      logo,
      pricing: monthly && quarterly && halfYearly
        ? { monthly: Number(monthly), quarterly: Number(quarterly), halfYearly: Number(halfYearly) }
        : undefined,
      checkinSimulated: checkinDone,
    });
  };

  const continueStep = async () => {
    registerCtaActivity();
    setAttemptedNext(true);
    setError("");
    if (step === 1 && (!gymName.trim() || !city.trim())) {
      setError("Add your gym name and city to continue.");
      return;
    }
    if (
      step === 2
      && (!monthly || !quarterly || !halfYearly || Number(monthly) <= 0 || Number(quarterly) <= 0 || Number(halfYearly) <= 0)
    ) {
      setError("Enter valid monthly, quarterly, and half-yearly pricing.");
      return;
    }
    if (step === 3 && !checkinDone) {
      setError("Run one check-in preview to continue.");
      return;
    }

    setIsAdvancing(true);
    try {
      await wait(step === 2 ? UI_TIMING.onboarding.pricingSaveMs : UI_TIMING.onboarding.stepAdvanceMs);
      if (step === 2) {
        await updateTenantPricingRequest(gymSlug, {
          monthly: Number(monthly),
          quarterly: Number(quarterly),
          halfYearly: Number(halfYearly),
        });
      }

      track("onboarding_step_completed", { gymSlug, step });
      if (step === 3) track("first_checkin_simulated", { gymSlug });

      if (step === TOTAL_STEPS) {
        const completedAt = new Date().toISOString();
        window.sessionStorage.setItem(`onboarding-just-completed:${gymSlug}`, "first-member");
        saveOnboardingState(gymSlug, {
          completedAt,
          currentStep: TOTAL_STEPS,
          gymName,
          city,
          logo,
          pricing: { monthly: Number(monthly), quarterly: Number(quarterly), halfYearly: Number(halfYearly) },
          checkinSimulated: checkinDone,
        });
        markOnboardingCompleted(gymSlug);
        setLastAction(gymSlug, "onboarding_complete");
        completedRef.current = true;
        track("onboarding_completed", { gymSlug });
        localStorage.setItem("gymtra_onboarding_completed", "1");
        navigate(`/${gymSlug}/owner`);
        return;
      }
      goToStep(step + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this step. Please try again.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const skipOptional = () => {
    if (step === 1) {
      setLogo("");
    }
    continueStep();
  };

  const stepMeta = {
    1: { title: "Set up your gym", subtitle: reducedGuidance ? "Add your basics to continue." : "Set your basics. Your workspace is ready from day one." },
    2: { title: "Set pricing", subtitle: reducedGuidance ? "Set all plan prices." : "Set monthly, quarterly, and half-yearly plans." },
    3: { title: "Preview check-in", subtitle: reducedGuidance ? "Run one check-in preview." : "Run one check-in. Daily flow becomes clear." },
    4: { title: "You're live.", subtitle: "Everything is in place. Gymtra now keeps this moving." },
  }[step as 1 | 2 | 3 | 4];

  const canContinue =
    (step === 1 && gymName.trim().length > 0 && city.trim().length > 0) ||
    (step === 2 && Number(monthly) > 0 && Number(quarterly) > 0 && Number(halfYearly) > 0) ||
    (step === 3 && checkinDone) ||
    step === 4;

  const nextLabel = step === 2 ? "Save pricing" : step === 4 ? "Go to dashboard" : "Continue";

  const helperHint =
    step === 1
      ? "Next: Set your pricing."
      : step === 2
        ? "Next: Run one check-in."
        : step === 3
            ? "Next: Open your dashboard."
            : "Next: Continue from your dashboard.";

  useEffect(() => {
    if (canContinue && !lastCanContinue) {
      setCtaPulse(true);
      const timer = window.setTimeout(() => setCtaPulse(false), 550);
      setLastCanContinue(true);
      return () => window.clearTimeout(timer);
    }
    if (!canContinue) {
      setLastCanContinue(false);
    }
  }, [canContinue, lastCanContinue]);

  const showSuccess = (condition: boolean) =>
    condition ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 animate-in fade-in-0 zoom-in-95">
        <CheckCircle2 className="h-3.5 w-3.5" /> Set
      </span>
    ) : null;

  if (!primingDone) {
    return (
      <OnboardingLayout>
      <StepHeader title="Set up your gym" subtitle={reducedGuidance ? "Takes about two minutes." : "Quick setup before your guided flow."} step={1} total={TOTAL_STEPS} />
        <StepCard
          hintSlot={
            <span
              className="inline-block text-xs text-muted-foreground/80"
              style={{ transitionDuration: `${UI_TIMING.buttonPressMs}ms`, transitionTimingFunction: EASING.standard }}
            >
              Takes ~2 minutes
            </span>
          }
        >
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Gym name</Label>
              <Input
                ref={firstInputRef}
                aria-label="Gym name"
                value={gymName}
                onFocus={registerFocusActivity}
                onChange={(e) => {
                  setGymName(e.target.value);
                  registerInputActivity();
                }}
                placeholder="Star Fitness"
              />
            </div>
            <div>
              <Label className="mb-1 block">City</Label>
              <Input
                aria-label="City"
                value={city}
                onFocus={registerFocusActivity}
                onChange={(e) => {
                  setCity(e.target.value);
                  registerInputActivity();
                }}
                placeholder="Mumbai"
              />
            </div>
          </div>
        </StepCard>
        <StepFooter>
          <div />
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!gymName.trim() || !city.trim()}
            onClick={() => {
              registerCtaActivity();
              setPrimingDone(true);
              saveOnboardingState(gymSlug, {
                startedAt: saved.startedAt || new Date().toISOString(),
                currentStep: step,
                gymName,
                city,
                logo,
                pricing: monthly && quarterly && halfYearly
                  ? { monthly: Number(monthly), quarterly: Number(quarterly), halfYearly: Number(halfYearly) }
                  : undefined,
              });
            }}
          >
            Start setup
          </Button>
        </StepFooter>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <StepHeader title={stepMeta.title} subtitle={stepMeta.subtitle} step={step} total={TOTAL_STEPS} />
      <div
        key={step}
        className="animate-in fade-in-0 slide-in-from-bottom-2"
        style={{
          animationDuration: `${transitionMs}ms`,
          animationTimingFunction: EASING.entrance,
        }}
      >
        <StepCard
          hintSlot={
            <>
              {frictionHint ? (
                <span
                  className="inline-block animate-in fade-in-0"
                  style={{ animationDuration: `${UI_TIMING.buttonReleaseMs}ms` }}
                >
                  {frictionHint}
                </span>
              ) : null}
              {!frictionHint ? <span className="text-xs text-muted-foreground/80">Takes ~2 minutes</span> : null}
            </>
          }
        >
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Gym name</Label>
                  {showSuccess(gymName.trim().length > 0)}
                </div>
                <Input
                  aria-label="Gym name"
                  value={gymName}
                  onFocus={registerFocusActivity}
                  onBlur={() => {
                    setFocusChurn((current) => {
                      const next = current + 1;
                      if (next >= 2) showFrictionRecovery("Gym name and city are enough to continue.");
                      return next;
                    });
                  }}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setGymName(nextValue);
                    if (!nextValue.trim()) showFrictionRecovery("Gym name and city are enough to continue.");
                    registerInputActivity();
                  }}
                  placeholder="Star Fitness"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>City</Label>
                  {showSuccess(city.trim().length > 0)}
                </div>
                <Input
                  aria-label="City"
                  value={city}
                  onFocus={registerFocusActivity}
                  onBlur={() => {
                    setFocusChurn((current) => {
                      const next = current + 1;
                      if (next >= 2) showFrictionRecovery("Gym name and city are enough to continue.");
                      return next;
                    });
                  }}
                  onChange={(e) => {
                    setCity(e.target.value);
                    registerInputActivity();
                  }}
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <Label className="mb-1 block">Logo URL (optional)</Label>
                <Input
                  aria-label="Logo URL optional"
                  value={logo}
                  onFocus={registerFocusActivity}
                  onChange={(e) => {
                    setLogo(e.target.value);
                    registerInputActivity();
                  }}
                  placeholder="https://your-logo-url"
                />
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Live preview</p>
                <p className="mt-1 text-muted-foreground">
                  {gymName.trim() || "Your gym"} in {city.trim() || "your city"} is ready.
                </p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Monthly price</Label>
                  {showSuccess(Number(monthly) > 0)}
                </div>
                <Input
                  aria-label="Monthly price"
                  type="number"
                  value={monthly}
                  onFocus={registerFocusActivity}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setMonthly(nextValue);
                    if (!nextValue.trim()) showFrictionRecovery("One price first. Add the second to continue.");
                    registerInputActivity();
                  }}
                  placeholder="1800"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Quarterly price</Label>
                  {showSuccess(Number(quarterly) > 0)}
                </div>
                <Input
                  aria-label="Quarterly price"
                  type="number"
                  value={quarterly}
                  onFocus={registerFocusActivity}
                  onChange={(e) => {
                    setQuarterly(e.target.value);
                    registerInputActivity();
                  }}
                  placeholder="4800"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Half-yearly price</Label>
                  {showSuccess(Number(halfYearly) > 0)}
                </div>
                <Input
                  aria-label="Half-yearly price"
                  type="number"
                  value={halfYearly}
                  onFocus={registerFocusActivity}
                  onChange={(e) => {
                    setHalfYearly(e.target.value);
                    registerInputActivity();
                  }}
                  placeholder="7000"
                />
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Live preview</p>
                <p className="mt-1 text-muted-foreground">
                  Members will pay {Number(monthly) > 0 ? `₹${Number(monthly).toLocaleString("en-IN")}` : "₹0"}/month
                  {" "}or{" "}
                  {Number(quarterly) > 0 ? `₹${Number(quarterly).toLocaleString("en-IN")}` : "₹0"}/quarter
                  {" "}or{" "}
                  {Number(halfYearly) > 0 ? `₹${Number(halfYearly).toLocaleString("en-IN")}` : "₹0"}/half-yearly.
                </p>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed p-5 text-center">
                <p className="text-sm text-muted-foreground">Tap once to simulate a member check-in.</p>
                <Button
                  className="mt-4 transition-transform active:scale-[0.98]"
                  style={{ transitionDuration: `${UI_TIMING.buttonPressMs}ms`, transitionTimingFunction: EASING.standard }}
                  disabled={isSimulatingCheckin}
                  aria-label="Simulate first check-in"
                  onClick={async () => {
                    registerInputActivity();
                    setIsSimulatingCheckin(true);
                    await wait(UI_TIMING.onboarding.checkinSimulateMs);
                    setCheckinDone(true);
                    track("demo_interaction", { source: "onboarding_checkin_preview" });
                    setIsSimulatingCheckin(false);
                  }}
                >
                  {isSimulatingCheckin ? "Simulating..." : "Simulate check-in"}
                </Button>
                {checkinDone && (
                  <div className="mt-4 inline-flex animate-in fade-in-0 slide-in-from-bottom-1 items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Attendance now tracks automatically.
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border bg-emerald-500/10 px-3 py-2 text-emerald-600">
                You're set. Your dashboard is now configured.
              </div>
              <p>Track attendance daily from one dashboard.</p>
              <p>Follow up on absences before churn risk rises.</p>
              <p>Monitor streaks and renewals in real time.</p>
            </div>
          )}
          {error ? <p className="mt-4 text-sm text-destructive feedback-error-shake">{error}</p> : null}
          {!reducedGuidance ? <p className="mt-4 text-sm text-muted-foreground">{helperHint}</p> : null}
          {attemptedNext && !canContinue && !error ? <p className="mt-2 text-sm text-muted-foreground">Finish required fields to unlock the next step.</p> : null}
        </StepCard>
      </div>

      <StepFooter>
        <div>
          {step > 1 ? (
            <Button aria-label="Go back one step" type="button" variant="ghost" onClick={() => goToStep(step - 1)}>
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {step === 1 ? (
            <Button aria-label="Skip logo step" type="button" variant="outline" onClick={skipOptional}>
              Skip logo
            </Button>
          ) : null}
          <Button
            aria-label={nextLabel}
            type="button"
            disabled={!canContinue || isAdvancing}
            className={`${ctaPulse ? "animate-pulse" : ""} interactive-ripple w-full sm:w-auto`}
            onClick={() => void continueStep()}
          >
            {isAdvancing ? "Saving..." : nextLabel}
          </Button>
        </div>
      </StepFooter>
    </OnboardingLayout>
  );
};

export default OwnerOnboarding;

