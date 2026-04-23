import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { AuthUser, Role } from "@/lib/types";
import { ApiError, setAuthFailureHandler } from "@/lib/api-client";
import { loginPhoneRequest, loginRequest, logoutRequest, meRequest } from "@/lib/auth-api";
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const hydrateSession = async () => {
      try {
        const authUser = await meRequest();
        if (mounted) {
          setUser(authUser);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    hydrateSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = async () => {
      setUser(null);
      await unregisterPushSubscription().catch(() => undefined);
    };
    setAuthFailureHandler(handler);
    return () => setAuthFailureHandler(null);
  }, []);

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
    await unregisterPushSubscription().catch(() => undefined);
    setUser(null);
  }, []);

  const isRole = useCallback((role: Role) => user?.role === role, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const authUser = await meRequest();
      setUser(authUser);
    } catch {
      setUser(null);
    }
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
