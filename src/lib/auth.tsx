import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type AppUser = { id: string; email: string; displayName: string };

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/current-user", { credentials: "include" });
      if (res.ok) {
        const u = await res.json();
        setUser(u as AppUser | null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        refresh,
        signOut: async () => {
          try {
            await fetch("/api/signout", { method: "POST", credentials: "include" });
          } finally {
            setUser(null);
          }
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
