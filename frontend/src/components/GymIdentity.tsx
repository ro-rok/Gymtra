import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface GymIdentityProps {
  name: string;
  logo?: string;
  brandColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-9 h-9 rounded-lg text-sm",
  md: "w-14 h-14 rounded-2xl text-lg",
  lg: "w-20 h-20 rounded-3xl text-3xl",
};

const isImageLogo = (logo?: string) => {
  if (!logo) return false;
  return /^https?:\/\//.test(logo) || /^data:image\//.test(logo);
};

export const GymIdentity = ({ name, logo, brandColor, size = "md", className }: GymIdentityProps) => {
  const [imgError, setImgError] = useState(false);
  const imageLike = isImageLogo(logo) && !imgError;
  const fallbackText = useMemo(() => {
    if (logo && !isImageLogo(logo)) return logo.slice(0, 2).toUpperCase();
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    return (parts[0]?.slice(0, 2) || "GY").toUpperCase();
  }, [logo, name]);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border/70 bg-card/80 flex items-center justify-center font-display font-semibold",
        sizeMap[size],
        className
      )}
      style={brandColor ? { boxShadow: `inset 0 0 0 1px ${brandColor}33` } : undefined}
      aria-label={`${name} identity`}
    >
      {imageLike ? (
        <img
          src={logo}
          alt={`${name} logo`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: brandColor
                ? `linear-gradient(145deg, ${brandColor}99 0%, ${brandColor}33 52%, hsl(var(--secondary) / 0.94) 100%)`
                : "linear-gradient(145deg, hsl(var(--primary-neon) / 0.4) 0%, hsl(210 65% 58% / 0.25) 52%, hsl(var(--secondary) / 0.94) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_55%)]" />
          <span className="relative text-foreground tracking-wide">{fallbackText}</span>
        </>
      )}
    </div>
  );
};
