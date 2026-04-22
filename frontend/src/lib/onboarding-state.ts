export interface OnboardingPricing {
  monthly: number;
  quarterly: number;
}

interface OnboardingState {
  startedAt?: string;
  completedAt?: string;
  currentStep: number;
  gymName?: string;
  city?: string;
  logo?: string;
  firstMemberName?: string;
  firstMemberPhone?: string;
  pricing?: OnboardingPricing;
  checkinSimulated?: boolean;
}

const keyFor = (gymSlug: string) => `gymtra:onboarding:${gymSlug}`;
const demoSeenKey = (gymSlug: string) => `demo_seen:${gymSlug}`;
const onboardingCompletedKey = (gymSlug: string) => `onboarding_completed:${gymSlug}`;
const lastActionKey = (gymSlug: string) => `last_action:${gymSlug}`;
const HAS_SEEN_DEMO_ANY = "has_seen_demo_any";
const HAS_COMPLETED_ONBOARDING_ANY = "has_completed_onboarding_any";

const defaultState: OnboardingState = {
  currentStep: 1,
};

export const getOnboardingState = (gymSlug: string): OnboardingState => {
  if (!gymSlug) return defaultState;
  try {
    const raw = window.localStorage.getItem(keyFor(gymSlug));
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as OnboardingState;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
};

export const saveOnboardingState = (gymSlug: string, patch: Partial<OnboardingState>) => {
  if (!gymSlug) return;
  const current = getOnboardingState(gymSlug);
  window.localStorage.setItem(keyFor(gymSlug), JSON.stringify({ ...current, ...patch }));
};

export const clearOnboardingState = (gymSlug: string) => {
  if (!gymSlug) return;
  window.localStorage.removeItem(keyFor(gymSlug));
};

export const isOnboardingComplete = (gymSlug: string) => Boolean(getOnboardingState(gymSlug).completedAt);

export const hasSavedPricing = (gymSlug: string) => {
  const state = getOnboardingState(gymSlug);
  return Boolean(state.pricing && state.pricing.monthly > 0 && state.pricing.quarterly > 0);
};

const getBool = (key: string) => window.localStorage.getItem(key) === "true";

export const markDemoSeen = (gymSlug: string) => {
  if (!gymSlug) return;
  window.localStorage.setItem(demoSeenKey(gymSlug), "true");
  window.localStorage.setItem(HAS_SEEN_DEMO_ANY, "true");
};

export const hasSeenDemo = (gymSlug: string) => {
  if (!gymSlug) return false;
  return getBool(demoSeenKey(gymSlug));
};

export const hasSeenDemoAny = () => getBool(HAS_SEEN_DEMO_ANY);

export const markOnboardingCompleted = (gymSlug: string) => {
  if (!gymSlug) return;
  window.localStorage.setItem(onboardingCompletedKey(gymSlug), "true");
  window.localStorage.setItem(HAS_COMPLETED_ONBOARDING_ANY, "true");
};

export const hasCompletedOnboarding = (gymSlug: string) => {
  if (!gymSlug) return false;
  return getBool(onboardingCompletedKey(gymSlug));
};

export const hasCompletedOnboardingAny = () => getBool(HAS_COMPLETED_ONBOARDING_ANY);

export const setLastAction = (gymSlug: string, action: string) => {
  if (!gymSlug) return;
  window.localStorage.setItem(lastActionKey(gymSlug), action);
};

export const getLastAction = (gymSlug: string) => {
  if (!gymSlug) return null;
  return window.localStorage.getItem(lastActionKey(gymSlug));
};

