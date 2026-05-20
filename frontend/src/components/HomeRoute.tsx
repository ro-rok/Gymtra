import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPathForUser } from "@/lib/dashboard-routes";
import Landing from "@/pages/Landing";

export const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    const dashboardPath = getDashboardPathForUser(user);
    if (dashboardPath) {
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return <Landing />;
};
