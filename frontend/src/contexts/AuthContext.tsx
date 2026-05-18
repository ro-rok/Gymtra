import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import type { AuthUser, Role } from "@/lib/types";
import { ApiError, refreshSession, setAuthFailureHandler } from "@/lib/api-client";
import { loginPhoneRequest, loginRequest, logoutRequest, meRequest } from "@/lib/auth-api";
import { clearStoredAuth } from "@/lib/auth-storage";
import { unregisterPushSubscription } from "@/lib/push-api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, gymSlug?: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  loginWithPhone: (phone: string, password: string, gymSlug?: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  isRole: (role: Role) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hydrateUser = async (): Promise<AuthUser | null> => {
  try {
    return await meRequest();
  } catch {
    const refreshed = await refreshSession();
    if (!refreshed) return null;
    try {
      return await meRequest();
    } catch {
      return null;
    }
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const resumeRefreshTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const authUser = await hydrateUser();
      if (mounted) {
        setUser(authUser);
        setLoading(false);
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = async () => {
      clearStoredAuth();
      setUser(null);
      await unregisterPushSubscription().catch(() => undefined);
    };
    setAuthFailureHandler(handler);
    return () => setAuthFailureHandler(null);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || loading) return;
      if (resumeRefreshTimer.current) window.clearTimeout(resumeRefreshTimer.current);
      resumeRefreshTimer.current = window.setTimeout(async () => {
        const ok = await refreshSession();
        if (!ok) return;
        try {
          const authUser = await meRequest();
          setUser(authUser);
        } catch {
          // Keep existing user until a protected request fails.
        }
      }, 500);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (resumeRefreshTimer.current) window.clearTimeout(resumeRefreshTimer.current);
    };
  }, [loading]);

  const login = useCallback(async (email: string, password: string, gymSlug?: string) => {
    try {
      const response = await loginRequest({ email, password, gymSlug });
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Unable to sign in right now. Please try again." };
    }
  }, []);

  const loginWithPhone = useCallback(async (phone: string, password: string, gymSlug?: string) => {
    try {
      const response = await loginPhoneRequest({ phone, password, gymSlug });
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Unable to sign in right now. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Backends may not expose logout while cookie expires naturally.
    }
    clearStoredAuth();
    await unregisterPushSubscription().catch(() => undefined);
    setUser(null);
  }, []);

  const isRole = useCallback((role: Role) => user?.role === role, [user]);

  const refreshUser = useCallback(async () => {
    const authUser = await hydrateUser();
    setUser(authUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPhone, logout, isRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
