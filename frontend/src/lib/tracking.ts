type TrackingPayload = Record<string, unknown> | undefined;

const TRACKING_NAMESPACE = "gymtra:activation";

export const track = (eventName: string, payload?: TrackingPayload) => {
  const event = {
    namespace: TRACKING_NAMESPACE,
    eventName,
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };

  // Analytics-ready shim; replace with vendor SDK later.
  // eslint-disable-next-line no-console
  console.info("[track]", event);
};

export const trackOnboardingDropoff = (payload: {
  step: number;
  timeSpent: number;
  lastInteraction: "input" | "focus" | "cta" | null;
}) => {
  track("onboarding_dropoff", payload);
};

