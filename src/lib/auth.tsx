import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser, signOut as signOutFn } from "@/lib/auth.functions";

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
  const getMe = useServerFn(getCurrentUser);
  const doSignOut = useServerFn(signOutFn);

  const refresh = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u as AppUser | null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getMe]);

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
          await doSignOut();
          setUser(null);
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
