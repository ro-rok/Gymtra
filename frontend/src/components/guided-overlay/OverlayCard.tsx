import { useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GuidedPlacement } from "@/components/guided-overlay/GuidedStep";
import { EASING, UI_TIMING } from "@/lib/ui-timing";

interface OverlayCardProps {
  stepTitle: string;
  stepDescription: string;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  placement?: GuidedPlacement;
  canGoBack: boolean;
  nextLabel: string;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
}

const CARD_WIDTH = 320;
const GAP = 14;

const choosePlacement = (targetRect: DOMRect | null, preferred: GuidedPlacement) => {
  if (!targetRect || preferred !== "auto") return preferred;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const roomBottom = viewportHeight - targetRect.bottom;
  const roomTop = targetRect.top;
  const roomRight = viewportWidth - targetRect.right;
  const roomLeft = targetRect.left;

  if (roomBottom > 240) return "bottom";
  if (roomTop > 240) return "top";
  if (roomRight > CARD_WIDTH + GAP) return "right";
  if (roomLeft > CARD_WIDTH + GAP) return "left";
  return "bottom";
};

export const OverlayCard = ({
  stepTitle,
  stepDescription,
  stepIndex,
  totalSteps,
  targetRect,
  placement = "auto",
  canGoBack,
  nextLabel,
  onSkip,
  onBack,
  onNext,
}: OverlayCardProps) => {
  const resolvedPlacement = useMemo(() => choosePlacement(targetRect, placement), [placement, targetRect]);
  const [position, setPosition] = useState({ top: 24, left: 24 });

  useLayoutEffect(() => {
    if (!targetRect) {
      setPosition({ top: 24, left: 24 });
      return;
    }
    const maxLeft = Math.max(16, window.innerWidth - CARD_WIDTH - 16);
    const centerLeft = targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2;
    const clampLeft = Math.min(Math.max(16, centerLeft), maxLeft);

    if (resolvedPlacement === "top") {
      setPosition({ top: Math.max(16, targetRect.top - 172), left: clampLeft });
      return;
    }
    if (resolvedPlacement === "bottom") {
      setPosition({ top: Math.min(window.innerHeight - 184, targetRect.bottom + GAP), left: clampLeft });
      return;
    }
    if (resolvedPlacement === "right") {
      setPosition({
        top: Math.min(window.innerHeight - 184, Math.max(16, targetRect.top)),
        left: Math.min(window.innerWidth - CARD_WIDTH - 16, targetRect.right + GAP),
      });
      return;
    }
    setPosition({
      top: Math.min(window.innerHeight - 184, Math.max(16, targetRect.top)),
      left: Math.max(16, targetRect.left - CARD_WIDTH - GAP),
    });
  }, [resolvedPlacement, targetRect]);

  const arrowStyle = useMemo(() => {
    if (!targetRect) return {};
    const cardCenterX = position.left + CARD_WIDTH / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    return { left: Math.max(24, Math.min(CARD_WIDTH - 24, targetCenterX - cardCenterX + CARD_WIDTH / 2)) };
  }, [position.left, targetRect]);

  return (
    <div
      className="fixed z-[62] w-[320px] rounded-2xl border bg-card p-4 shadow-xl animate-in fade-in-0 zoom-in-95"
      style={{
        top: position.top,
        left: position.left,
        animationDuration: `${UI_TIMING.overlayEnterMs}ms`,
        animationTimingFunction: EASING.standard,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Guided demo step ${stepIndex + 1} of ${totalSteps}`}
    >
      {(resolvedPlacement === "bottom" || resolvedPlacement === "top") && (
        <span
          className="absolute h-3 w-3 rotate-45 border bg-card"
          style={{
            ...(resolvedPlacement === "bottom" ? { top: -7 } : { bottom: -7 }),
            ...arrowStyle,
          }}
          aria-hidden="true"
        />
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Guided demo {stepIndex + 1} of {totalSteps}
      </p>
      <h3 className="mt-2 text-base font-semibold">{stepTitle}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{stepDescription}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          {canGoBack ? (
            <Button aria-label="Go to previous step" variant="ghost" type="button" onClick={onBack}>
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button aria-label="Skip guided tour" variant="ghost" type="button" onClick={onSkip}>
            Skip tour
          </Button>
          <Button aria-label="Go to next guided step" type="button" onClick={onNext}>
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

