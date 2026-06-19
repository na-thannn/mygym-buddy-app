import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/authContext";
import { AccessDenied } from "@/components/AccessDenied";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <AccessDenied title="Admin access required" />;
  }

  return <Outlet />;
}
