import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
};
