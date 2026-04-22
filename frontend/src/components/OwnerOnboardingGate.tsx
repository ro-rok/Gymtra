import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { listMembersRequest } from "@/lib/member-api";
import { hasSavedPricing, isOnboardingComplete } from "@/lib/onboarding-state";
import { track } from "@/lib/tracking";

export const OwnerOnboardingGate = ({ children }: { children: ReactNode }) => {
  const { gymSlug = "" } = useParams();
  const location = useLocation();
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
        const members = await listMembersRequest();
        const missingMembers = members.length === 0;
        const missingPricing = !hasSavedPricing(gymSlug);
        if (mounted) {
          setRequiresOnboarding(missingMembers || missingPricing);
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
  }, [gymSlug]);

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

