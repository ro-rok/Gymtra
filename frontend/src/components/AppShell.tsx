import { ReactNode } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { LucideIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { PageMeta } from "@/components/PageMeta";

export type NavItem = { to: string; label: string; icon: LucideIcon };

interface AppShellProps {
  brand: { name: string; logo: string; role: string };
  nav: NavItem[];
  children: ReactNode;
}

export const AppShell = ({ brand, nav, children }: AppShellProps) => {
  const { gymSlug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const resolve = (to: string) => (gymSlug ? to.replace(":gymSlug", gymSlug) : to);

  const handleLogout = async () => {
    await logout();
    navigate(gymSlug ? `/${gymSlug}` : "/");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta title={`${brand.name} | ${brand.role}`} canonicalPath={typeof window !== "undefined" ? window.location.pathname : "/"} noindex />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-40">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-xl shadow-glow">
              {brand.logo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-sidebar-accent-foreground truncate text-[15px]">{brand.name}</div>
              <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-[0.15em] font-semibold">{brand.role}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={resolve(item.to)}
              end
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />}
                  <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "")} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {user.avatar || user.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sidebar-accent-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-secondary/95 backdrop-blur text-secondary-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-base">
            {brand.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold truncate text-sm">{brand.name}</div>
            <div className="text-[10px] text-secondary-foreground/60 uppercase tracking-[0.15em] font-semibold">{brand.role}</div>
          </div>
          <Button variant="ghost" size="icon" className="text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-white/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="md:pl-64 pb-24 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-secondary/95 backdrop-blur text-secondary-foreground border-t border-sidebar-border">
        <div className="grid grid-flow-col auto-cols-fr">
          {nav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={resolve(item.to)}
              end
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-secondary-foreground/60"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />}
                  <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                  <span className="truncate max-w-full px-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
