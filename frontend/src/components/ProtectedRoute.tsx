import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { getDashboardPathForUser } from "@/lib/dashboard-routes";
import type { Role } from "@/lib/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  gymScoped?: boolean; // if true, also checks user belongs to this gym
}

export const ProtectedRoute = ({ allowedRoles, children, gymScoped = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { loading: tenantLoading, invalidTenant } = useTenant();
  const location = useLocation();

  if (loading || (gymScoped && tenantLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (gymScoped && invalidTenant) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    // Redirect to appropriate login
    const isAdmin = location.pathname.startsWith("/admin");
    const gymSlug = location.pathname.split("/")[1];
    const loginPath = isAdmin ? "/admin/login" : gymSlug ? `/${gymSlug}` : "/";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboardPath = getDashboardPathForUser(user);
    return <Navigate to={dashboardPath ?? "/"} replace />;
  }

  if (user.mustChangePassword && !location.pathname.endsWith("/change-password-required")) {
    const gymSlug = location.pathname.split("/")[1];
    if (gymSlug) {
      return <Navigate to={`/${gymSlug}/change-password-required`} replace />;
    }
  }

  // For gym-scoped routes, verify user belongs to the gym
  if (gymScoped && user.role !== "super_admin") {
    const pathSlug = location.pathname.split("/")[1];
    if (user.gymSlug && user.gymSlug !== pathSlug) {
      const dashboardPath = getDashboardPathForUser(user);
      return <Navigate to={dashboardPath ?? `/${user.gymSlug}`} replace />;
    }
  }

  return <>{children}</>;
};
