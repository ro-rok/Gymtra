import { Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Salad, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTenant } from "@/contexts/TenantContext";

const nav = [
  { to: "/:gymSlug/trainer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/:gymSlug/trainer/members", label: "Members", icon: Users },
  { to: "/:gymSlug/trainer/diet", label: "Diet", icon: Salad },
  { to: "/:gymSlug/trainer/attendance", label: "Attendance", icon: CalendarCheck },
];

const TrainerLayout = () => {
  const { gym, loading } = useTenant();
  if (loading || !gym) return null;
  return (
    <AppShell brand={{ name: gym.name, logo: gym.logo, role: "Trainer" }} nav={nav}>
      <Outlet />
    </AppShell>
  );
};
export default TrainerLayout;
