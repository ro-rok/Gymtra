import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchGymBySlug } from "@/lib/tenant-api";
import { hasSavedPricing, isOnboardingComplete } from "@/lib/onboarding-state";
import { track } from "@/lib/tracking";

export const OwnerOnboardingGate = ({ children }: { children: ReactNode }) => {
  const { gymSlug = "" } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!gymSlug) {
        if (mounted) setLoading(false);
        return;
      }
      if (isOnboardingComplete(gymSlug)) {
        if (mounted) {
          setRequiresOnboarding(false);
          setLoading(false);
        }
        return;
      }
      try {
        const gym = await fetchGymBySlug(gymSlug);
        const hasGymProfileData = Boolean(gym.name?.trim() && gym.city?.trim());
        const hasOwnerProfileData = Boolean(user?.role === "owner" && user.name?.trim() && user.email?.trim());
        if (hasGymProfileData && hasOwnerProfileData) {
          if (mounted) setRequiresOnboarding(false);
          return;
        }

        const missingPricing = !hasSavedPricing(gymSlug);
        if (mounted) {
          setRequiresOnboarding(missingPricing);
        }
      } catch {
        if (mounted) setRequiresOnboarding(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, [gymSlug, user?.email, user?.name, user?.role]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const onboardingPath = `/${gymSlug}/onboarding`;
  const alreadyOnboarding = location.pathname === onboardingPath;
  if (requiresOnboarding && !alreadyOnboarding) {
    track("onboarding_started", { gymSlug, sourcePath: location.pathname });
    return <Navigate to={onboardingPath} replace />;
  }
  if (!requiresOnboarding && alreadyOnboarding) {
    return <Navigate to={`/${gymSlug}/owner`} replace />;
  }

  return <>{children}</>;
};

