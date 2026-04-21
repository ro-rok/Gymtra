import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { AuthUser, Role } from "@/lib/types";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "gymos_auth_user";

// Demo accounts — swap this with real API calls later
const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  "admin@gymos.app": {
    password: "admin123",
    user: { id: "u-admin", email: "admin@gymos.app", name: "Platform Admin", role: "super_admin", avatar: "PA" },
  },
  "owner@ironparadise.com": {
    password: "owner123",
    user: { id: "u-owner-1", email: "owner@ironparadise.com", name: "Raj Malhotra", role: "owner", gymId: "1", gymSlug: "iron-paradise", avatar: "RM" },
  },
  "trainer@ironparadise.com": {
    password: "trainer123",
    user: { id: "u-trainer-1", email: "trainer@ironparadise.com", name: "Rahul Mehra", role: "trainer", gymId: "1", gymSlug: "iron-paradise", avatar: "RM" },
  },
  "aarav@email.com": {
    password: "member123",
    user: { id: "u-member-1", email: "aarav@email.com", name: "Aarav Sharma", role: "member", gymId: "1", gymSlug: "iron-paradise", avatar: "AS" },
  },
  // Fit Republic gym
  "owner@fitrepublic.com": {
    password: "owner123",
    user: { id: "u-owner-2", email: "owner@fitrepublic.com", name: "Anita Desai", role: "owner", gymId: "2", gymSlug: "fit-republic", avatar: "AD" },
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const account = DEMO_ACCOUNTS[email.toLowerCase().trim()];
    if (!account || account.password !== password) {
      return { success: false, error: "Invalid email or password" };
    }
    setUser(account.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account.user));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isRole = useCallback((role: Role) => user?.role === role, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
