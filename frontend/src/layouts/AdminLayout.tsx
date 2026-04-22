import { Outlet, useParams } from "react-router-dom";
import { LayoutDashboard, Building2, CreditCard, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/gyms", label: "Gyms", icon: Building2 },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => (
  <AppShell brand={{ name: "Gymtra Console", logo: "🛡️", role: "Super Admin" }} nav={nav}>
    <Outlet />
  </AppShell>
);
export default AdminLayout;
