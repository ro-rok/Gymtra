import { Outlet, useParams } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, CalendarCheck, Salad, Receipt, Wallet, Bell, UserCog, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { mockGyms } from "@/lib/mock-data";

const nav = [
  { to: "/:gymSlug/owner", label: "Dashboard", icon: LayoutDashboard },
  { to: "/:gymSlug/owner/members", label: "Members", icon: Users },
  { to: "/:gymSlug/owner/memberships", label: "Plans", icon: CreditCard },
  { to: "/:gymSlug/owner/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/:gymSlug/owner/diet", label: "Diet", icon: Salad },
  { to: "/:gymSlug/owner/expenses", label: "Expenses", icon: Receipt },
  { to: "/:gymSlug/owner/payroll", label: "Payroll", icon: Wallet },
  { to: "/:gymSlug/owner/reminders", label: "Reminders", icon: Bell },
  { to: "/:gymSlug/owner/staff", label: "Staff", icon: UserCog },
  { to: "/:gymSlug/owner/settings", label: "Settings", icon: Settings },
];

const OwnerLayout = () => {
  const { gymSlug } = useParams();
  const gym = mockGyms.find((g) => g.slug === gymSlug) || mockGyms[0];
  return (
    <AppShell brand={{ name: gym.name, logo: gym.logo, role: "Owner" }} nav={nav}>
      <Outlet />
    </AppShell>
  );
};
export default OwnerLayout;
