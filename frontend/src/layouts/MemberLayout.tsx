import { Outlet, useParams } from "react-router-dom";
import { Home, Salad, TrendingUp, CreditCard, Zap, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { mockGyms } from "@/lib/mock-data";

const nav = [
  { to: "/:gymSlug/member", label: "Today", icon: Home },
  { to: "/:gymSlug/member/checkin", label: "Check-in", icon: Zap },
  { to: "/:gymSlug/member/diet", label: "Diet", icon: Salad },
  { to: "/:gymSlug/member/progress", label: "Progress", icon: TrendingUp },
  { to: "/:gymSlug/member/membership", label: "Plan", icon: CreditCard },
  { to: "/:gymSlug/member/profile", label: "Profile", icon: User },
];

const MemberLayout = () => {
  const { gymSlug } = useParams();
  const gym = mockGyms.find((g) => g.slug === gymSlug) || mockGyms[0];
  return (
    <AppShell brand={{ name: gym.name, logo: gym.logo, role: "Member" }} nav={nav}>
      <Outlet />
    </AppShell>
  );
};
export default MemberLayout;
