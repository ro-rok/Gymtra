import { EASING, UI_TIMING } from "@/lib/ui-timing";

interface SpotlightLayerProps {
  targetRect: DOMRect | null;
}

export const SpotlightLayer = ({ targetRect }: SpotlightLayerProps) => {
  if (!targetRect) {
    return <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/32 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        className="pointer-events-none fixed z-[61] rounded-xl ring-2 ring-primary/35"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.44)",
          transitionProperty: "top, left, width, height, box-shadow, opacity",
          transitionDuration: `${UI_TIMING.overlayEnterMs}ms`,
          transitionTimingFunction: EASING.standard,
        }}
        aria-hidden="true"
      />
    </>
  );
};

