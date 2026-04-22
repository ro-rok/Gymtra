import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OverlayCard } from "@/components/guided-overlay/OverlayCard";
import { SpotlightLayer } from "@/components/guided-overlay/SpotlightLayer";
import type { GuidedStep } from "@/components/guided-overlay/GuidedStep";
import { UI_TIMING } from "@/lib/ui-timing";

interface GuidedOverlayRootProps {
  steps: GuidedStep[];
  sessionKey: string;
  enabled?: boolean;
  onFinish?: () => void;
}

const getFocusable = (root: HTMLElement | null) => {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
};

export const GuidedOverlayRoot = ({ steps, sessionKey, enabled = true, onFinish }: GuidedOverlayRootProps) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !steps.length) {
      setOpen(false);
      return;
    }
    const isDone = window.sessionStorage.getItem(sessionKey) === "done";
    setOpen(!isDone);
  }, [enabled, sessionKey, steps.length]);

  const activeStep = steps[stepIndex];

  const updateTargetRect = useCallback(() => {
    if (!activeStep) return;
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${activeStep.targetId}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    setTargetRect(el.getBoundingClientRect());
  }, [activeStep]);

  useEffect(() => {
    if (!open) return;
    updateTargetRect();
    const onUpdate = () => window.requestAnimationFrame(updateTargetRect);
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const ro = new ResizeObserver(onUpdate);
    const el = activeStep ? document.querySelector<HTMLElement>(`[data-tour-id="${activeStep.targetId}"]`) : null;
    if (el) ro.observe(el);

    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      ro.disconnect();
    };
  }, [activeStep, open, updateTargetRect]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("guided-overlay-active");
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove("guided-overlay-active");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = overlayRef.current;
    const focusable = getFocusable(root);
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.sessionStorage.setItem(sessionKey, "done");
        setOpen(false);
        onFinish?.();
        return;
      }
      if (event.key !== "Tab") return;
      const list = getFocusable(root);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onFinish, open, sessionKey]);

  const skip = useCallback(() => {
    window.sessionStorage.setItem(sessionKey, "done");
    setOpen(false);
    onFinish?.();
  }, [onFinish, sessionKey]);

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      skip();
      return;
    }
    setStepIndex((v) => v + 1);
  }, [skip, stepIndex, steps.length]);

  const back = useCallback(() => setStepIndex((v) => Math.max(0, v - 1)), []);

  const nextLabel = useMemo(() => {
    if (!activeStep) return "Next";
    if (activeStep.ctaLabel) return activeStep.ctaLabel;
    return stepIndex === steps.length - 1 ? "Finish" : "Next";
  }, [activeStep, stepIndex, steps.length]);

  if (!open || !activeStep) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60]"
      style={{ animationDuration: `${UI_TIMING.overlayEnterMs}ms` }}
      aria-live="polite"
    >
      <SpotlightLayer targetRect={targetRect} />
      <OverlayCard
        stepTitle={activeStep.title}
        stepDescription={activeStep.description}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        targetRect={targetRect}
        placement={activeStep.placement}
        canGoBack={stepIndex > 0}
        nextLabel={nextLabel}
        onSkip={skip}
        onBack={back}
        onNext={next}
      />
    </div>,
    document.body,
  );
};

