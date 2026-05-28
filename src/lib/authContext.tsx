import { createContext, useContext, type ReactNode } from "react";
import type { AppRole } from "./roles";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
};

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const Ctx = createContext<AuthCtx | undefined>(undefined);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
