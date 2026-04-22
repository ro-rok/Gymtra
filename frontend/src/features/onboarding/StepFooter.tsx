import type { ReactNode } from "react";

export const StepFooter = ({ children }: { children: ReactNode }) => (
  <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-3 py-3 backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
    <div className="mx-auto flex w-full max-w-[420px] items-center justify-between gap-3">{children}</div>
  </div>
);

