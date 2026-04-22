export type GuidedPlacement = "top" | "right" | "bottom" | "left" | "auto";

export interface GuidedStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  placement?: GuidedPlacement;
  ctaLabel?: string;
}

