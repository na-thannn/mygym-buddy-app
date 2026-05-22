import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { getCurrentUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    let user = null;
    if (import.meta.env.SSR) {
      user = await getCurrentUser();
    } else {
      try {
        const res = await fetch("/api/current-user", { credentials: "include" });
        if (res.ok) user = await res.json();
      } catch (err) {
        user = null;
      }
    }
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    }
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
