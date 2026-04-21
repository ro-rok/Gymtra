import { Outlet, useParams } from "react-router-dom";
import { LayoutDashboard, Users, Salad, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { mockGyms } from "@/lib/mock-data";

const nav = [
  { to: "/:gymSlug/trainer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/:gymSlug/trainer/members", label: "Members", icon: Users },
  { to: "/:gymSlug/trainer/diet", label: "Diet", icon: Salad },
  { to: "/:gymSlug/trainer/attendance", label: "Attendance", icon: CalendarCheck },
];

const TrainerLayout = () => {
  const { gymSlug } = useParams();
  const gym = mockGyms.find((g) => g.slug === gymSlug) || mockGyms[0];
  return (
    <AppShell brand={{ name: gym.name, logo: gym.logo, role: "Trainer" }} nav={nav}>
      <Outlet />
    </AppShell>
  );
};
export default TrainerLayout;
