import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  gymScoped?: boolean; // if true, also checks user belongs to this gym
}

export const ProtectedRoute = ({ allowedRoles, children, gymScoped = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate login
    const isAdmin = location.pathname.startsWith("/admin");
    const loginPath = isAdmin ? "/admin/login" : "/";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // For gym-scoped routes, verify user belongs to the gym
  if (gymScoped && user.role !== "super_admin") {
    const pathSlug = location.pathname.split("/")[1];
    if (user.gymSlug && user.gymSlug !== pathSlug) {
      return <Navigate to={`/${user.gymSlug}`} replace />;
    }
  }

  return <>{children}</>;
};
