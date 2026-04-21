import { createContext, useContext, ReactNode, useMemo } from "react";
import { useParams } from "react-router-dom";
import type { Gym } from "@/lib/types";
import { mockGyms } from "@/lib/mock-data";

interface TenantContextType {
  gym: Gym | null;
  gymSlug: string | undefined;
}

const TenantContext = createContext<TenantContextType>({ gym: null, gymSlug: undefined });

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { gymSlug } = useParams();
  const gym = useMemo(() => {
    if (!gymSlug) return null;
    const found = mockGyms.find((g) => g.slug === gymSlug);
    if (!found) return null;
    return { ...found, isActive: true, createdAt: "2025-01-01" } as Gym;
  }, [gymSlug]);

  return (
    <TenantContext.Provider value={{ gym, gymSlug }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
