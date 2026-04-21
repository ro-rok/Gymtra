import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Home, Salad, TrendingUp, CreditCard, Zap, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTenant } from "@/contexts/TenantContext";
import { usePushRegistration } from "@/hooks/usePushRegistration";

const nav = [
  { to: "/:gymSlug/member", label: "Today", icon: Home },
  { to: "/:gymSlug/member/checkin", label: "Check-in", icon: Zap },
  { to: "/:gymSlug/member/diet", label: "Diet", icon: Salad },
  { to: "/:gymSlug/member/progress", label: "Progress", icon: TrendingUp },
  { to: "/:gymSlug/member/membership", label: "Plan", icon: CreditCard },
  { to: "/:gymSlug/member/profile", label: "Profile", icon: User },
];

const MemberLayout = () => {
  const { gym, loading } = useTenant();
  const { registerPushSubscription } = usePushRegistration();
  useEffect(() => {
    registerPushSubscription().catch(() => undefined);
  }, [registerPushSubscription]);
  if (loading || !gym) return null;
  return (
    <AppShell brand={{ name: gym.name, logo: gym.logo, role: "Member" }} nav={nav}>
      <Outlet />
    </AppShell>
  );
};
export default MemberLayout;
