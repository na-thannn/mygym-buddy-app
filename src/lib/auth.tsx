import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Ctx, type AppUser } from "./authContext";

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
