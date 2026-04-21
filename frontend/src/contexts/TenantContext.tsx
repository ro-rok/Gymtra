import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Gym } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { fetchGymBySlug } from "@/lib/tenant-api";

interface TenantContextType {
  gym: Gym | null;
  gymSlug: string | undefined;
  loading: boolean;
  error: string | null;
  invalidTenant: boolean;
}

const TenantContext = createContext<TenantContextType>({
  gym: null,
  gymSlug: undefined,
  loading: false,
  error: null,
  invalidTenant: false,
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { gymSlug } = useParams();
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(Boolean(gymSlug));
  const [error, setError] = useState<string | null>(null);
  const [invalidTenant, setInvalidTenant] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!gymSlug) {
      setGym(null);
      setLoading(false);
      setError(null);
      setInvalidTenant(false);
      return;
    }

    setLoading(true);
    setError(null);
    setInvalidTenant(false);

    fetchGymBySlug(gymSlug)
      .then((tenantGym) => {
        if (!mounted) return;
        setGym(tenantGym);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setGym(null);
        if (err instanceof ApiError && err.status === 404) {
          setInvalidTenant(true);
          setError("We could not find that gym slug.");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Unable to load gym details right now.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [gymSlug]);

  return (
    <TenantContext.Provider value={{ gym, gymSlug, loading, error, invalidTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
