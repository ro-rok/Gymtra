import type { ReactNode } from "react";

export const OnboardingLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-6">
    <div className="mx-auto w-full max-w-[420px] pb-28 sm:pb-8">{children}</div>
  </div>
);

