import { createDemoData, type DemoDataset } from "@/lib/demoData";

let demoState: DemoDataset | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((cb) => cb());

export const initDemoState = (gymSlug: string) => {
  if (!demoState || demoState.gym.slug !== gymSlug) {
    demoState = createDemoData(gymSlug);
  }
  return demoState;
};

export const getDemoState = () => demoState;

export const subscribeDemoState = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const updateDemoState = (updater: (current: DemoDataset) => DemoDataset) => {
  if (!demoState) return;
  demoState = updater(demoState);
  notify();
};

