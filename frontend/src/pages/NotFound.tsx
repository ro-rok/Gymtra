import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { homePathForUser } from "@/lib/notification-routes";

const NotFound = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const home = homePathForUser(user);

  if (!loading) {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    return <Navigate to={home} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
};

export default NotFound;
