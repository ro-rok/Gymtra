export const UI_TIMING = {
  // Premium rhythm: no abrupt moves, clear narrative pacing.
  buttonPressMs: 180,
  buttonReleaseMs: 180,
  cardEnterMs: 240,
  overlayEnterMs: 260,
  overlayExitMs: 220,
  routeFadeMs: 420,
  flashMs: 180,
  staggerMs: 120,
  onboarding: {
    stepAdvanceMs: 140,
    pricingSaveMs: 220,
    checkinSimulateMs: 180,
    stepTransitionMs: 320,
  },
  demo: {
    addMemberMs: 240,
    markCheckinMs: 240,
    overlayAdvanceMs: 220,
    kpiCountMs: 320,
  },
  landing: {
    heroLoopMs: 7000,
    sublineIntervalMs: 2500,
    sublineExitMs: 160,
    sublineEnterMs: 200,
    event1StartMs: 1200,
    event2StartMs: 2200,
    event3StartMs: 3200,
    event4StartMs: 4500,
    resetStartMs: 6000,
    marqueeSpeedMs: 18000,
    eventBlendMs: 420,
    glowEnvelopeRiseMs: 260,
    glowEnvelopeFallMs: 520,
    mobileDampenFactor: 0.72,
    reducedMotionDampenFactor: 0.56,
  },
} as const;

export const EASING = {
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export const SPRING = {
  subtle: "cubic-bezier(0.23, 0.88, 0.3, 1)",
  gentle: "cubic-bezier(0.26, 0.84, 0.34, 1)",
} as const;

