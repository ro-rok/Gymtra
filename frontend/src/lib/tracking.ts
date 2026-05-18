type TrackingPayload = Record<string, unknown> | undefined;

export type TrackingEvent = {
  namespace: string;
  eventName: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

type TrackingProvider = (event: TrackingEvent) => void;

const TRACKING_NAMESPACE = "gymtra:activation";
const isDev = import.meta.env.DEV;

const consoleProvider: TrackingProvider = (event) => {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.info("[track]", event);
};

let provider: TrackingProvider = consoleProvider;

export const setTrackingProvider = (next: TrackingProvider | null) => {
  provider = next ?? consoleProvider;
};

export const track = (eventName: string, payload?: TrackingPayload) => {
  const event: TrackingEvent = {
    namespace: TRACKING_NAMESPACE,
    eventName,
    payload: payload || {},
    timestamp: new Date().toISOString(),
  };
  provider(event);
};

export const trackOnboardingDropoff = (payload: {
  step: number;
  timeSpent: number;
  lastInteraction: "input" | "focus" | "cta" | null;
}) => {
  track("onboarding_abandoned", payload);
};

export const trackOnboardingResumed = (payload?: TrackingPayload) => {
  track("onboarding_resumed", payload);
};
