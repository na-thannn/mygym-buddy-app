import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Apple,
  Dumbbell,
  Home,
  LineChart,
  LogOut,
  MessageCircle,
  Scale,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Home; roles?: ("admin" | "pt" | "user")[] };

const NAV: NavItem[] = [
  { to: "/feed", label: "Bảng tin", icon: Home },
  { to: "/inbody", label: "InBody", icon: Scale },
  { to: "/log/workout", label: "Tập luyện", icon: Dumbbell },
  { to: "/log/nutrition", label: "Dinh dưỡng", icon: Apple },
  { to: "/progress", label: "Tiến độ", icon: LineChart },
  { to: "/coach", label: "AI Coach", icon: MessageCircle },
  { to: "/profile", label: "Hồ sơ", icon: UserCircle },
];

export function AppLayout() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const items: NavItem[] = [...NAV];
  if (role === "pt" || role === "admin") items.push({ to: "/pt", label: "PT Dashboard", icon: Users });
  if (role === "admin") items.push({ to: "/admin", label: "Quản trị", icon: ShieldCheck });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border flex-col p-4 gap-1 sticky top-0 h-screen">
        <Link to="/feed" className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="font-bold leading-none">HL Fitness</div>
            <div className="text-[10px] text-muted-foreground">303 Lê Thanh Nghị</div>
          </div>
        </Link>
        {items.map((it) => {
          const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="size-4 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-20">
        <Link to="/feed" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Activity className="size-4" />
          </div>
          <span className="font-bold text-sm">HL Fitness</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="size-4" />
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 min-w-0 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-background border-t border-border flex items-center justify-around px-1 py-1">
        {items.slice(0, 5).map((it) => {
          const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}