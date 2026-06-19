import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ClipboardList,
  Dumbbell,
  FileText,
  LogOut,
  Sparkles,
  UserCircle,
  MessageCircle,
  Menu,
  Home,
  Scale,
  PieChart,
  LineChart,
  Shield,
  CalendarDays,
  Headphones,
  Inbox,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCustomerNavLabel } from "@/lib/customer-experience";
import { getSidebarNavClassName, getSidebarNavItemClassName } from "@/components/app-layout-nav";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import type { AppRole } from "@/lib/roles";

type NavGroup = "main" | "staff";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Activity;
  roles: AppRole[];
  group?: NavGroup;
  parentTo?: string;
};

const NAV: NavItem[] = [
  { to: "/feed", label: "Feed", icon: Home, roles: ["admin", "manager", "pt", "customer"], group: "main" },
  { to: "/pt-inbox", label: "PT Desk", icon: Inbox, roles: ["pt"], group: "main" },
  { to: "/staff", label: "Manager CRM", icon: Headphones, roles: ["admin", "manager"], group: "staff" },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["admin"], group: "staff" },
  { to: "/site", label: "Site Content", icon: Images, roles: ["admin"], group: "staff" },
  {
    to: "/classes",
    label: "Classes",
    icon: CalendarDays,
    roles: ["admin", "manager", "pt", "customer"],
    group: "main",
  },
  {
    to: "/bookings",
    label: "Bookings",
    icon: Activity,
    roles: ["admin", "manager", "pt", "customer"],
    group: "main",
  },
  { to: "/inbody", label: "InBody", icon: Scale, roles: ["customer"], group: "main" },
  { to: "/log/workout", label: "Workout", icon: Dumbbell, roles: ["customer"], group: "main" },
  { to: "/nutrition", label: "Nutrition", icon: PieChart, roles: ["customer"], group: "main" },
  { to: "/progress", label: "Progress", icon: LineChart, roles: ["customer"], group: "main" },
  {
    to: "/progress-report",
    label: "Progress Report",
    icon: FileText,
    roles: ["customer"],
    group: "main",
  },
  { to: "/trainer", label: "AI Coach", icon: MessageCircle, roles: ["customer"], group: "main" },
  { to: "/packages", label: "Packages", icon: ClipboardList, roles: ["customer"], group: "main" },
  { to: "/plans", label: "Plans", icon: ClipboardList, roles: ["customer"], group: "main" },
  { to: "/analyses", label: "AI Analyses", icon: Sparkles, roles: ["customer"], group: "main" },
  {
    to: "/profile",
    label: "Profile",
    icon: UserCircle,
    roles: ["admin", "manager", "pt", "customer"],
    group: "main",
  },
];

function getNavItems(role: AppRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV.filter((item) => item.roles.includes(role));
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src="/logo.jpg"
        alt="Logo"
        className={cn("shrink-0 object-cover", compact ? "size-7 rounded-md" : "size-9 rounded-lg")}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-none text-stone-50">HL Fitness</div>
        {!compact && <div className="mt-1 text-[11px] text-stone-400">Alex AI member app</div>}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const navItems = getNavItems(user?.role);

  const mainNav = navItems.filter((it) => (it.group ?? "main") === "main");
  const staffNav = navItems.filter((it) => (it.group ?? "main") === "staff");

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    type WinExt = Window & { __fetchPatched?: boolean };
    const win = window as unknown as WinExt;
    if (win.__fetchPatched) return;

    const origFetch = win.fetch.bind(win) as (
      input: RequestInfo,
      init?: RequestInit,
    ) => Promise<Response>;
    win.__fetchPatched = true;
    (win.fetch as (input: RequestInfo, init?: RequestInit) => Promise<Response>) = (
      input: RequestInfo,
      init?: RequestInit,
    ) => {
      const merged: RequestInit = {
        ...(init || {}),
        credentials: (init && init.credentials) ?? "include",
      };
      return origFetch(input, merged);
    };
  }, []);

  const renderNavItem = (it: NavItem, mobile = false) => {
    const activeExact = loc.pathname === it.to;
    const activeDescendant = loc.pathname.startsWith(it.to + "/");
    const active = activeExact || activeDescendant;
    const isChild = Boolean(it.parentTo);
    const isAdminParent = it.to === "/admin";
    const isAdminParentOpenOnly = isAdminParent && !activeExact && activeDescendant;
    const Icon = it.icon;
    const label = getCustomerNavLabel(user?.role, it.to, it.label);

    return (
      <Link
        key={it.to}
        to={it.to}
        className={cn(
          getSidebarNavItemClassName(mobile, isChild ? "child" : "default"),
          active
            ? isAdminParentOpenOnly
              ? "bg-white/[0.06] text-stone-50"
              : "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "text-stone-300 hover:bg-white/[0.06] hover:text-stone-50",
        )}
      >
        <Icon
          className={cn(mobile ? "size-5" : "size-4", "shrink-0", isChild && "opacity-85")}
          strokeWidth={1.8}
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const renderGroupLabel = (label: string) => (
    <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {label}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#080b0a] text-stone-100 dark">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <aside className="hidden h-[100dvh] w-72 shrink-0 flex-col border-r border-white/10 bg-[#0d1110] p-3 md:sticky md:top-0 md:flex">
          <Link
            to="/feed"
            className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
          >
            <BrandLockup />
          </Link>

          <nav className={getSidebarNavClassName(false)}>
            {mainNav.map((it) => renderNavItem(it))}
            {staffNav.length > 0 && (
              <>
                {renderGroupLabel("Staff")}
                <div className="mt-1 flex flex-col gap-0.5">{staffNav.map((it) => renderNavItem(it))}</div>
              </>
            )}
          </nav>

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 truncate px-3 text-xs leading-5 text-stone-400">{user?.email}</div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-xl text-stone-300 hover:bg-white/[0.06] hover:text-stone-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 size-4" strokeWidth={1.8} />
              Sign out
            </Button>
          </div>
        </aside>

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0d1110]/95 px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl text-stone-200">
                  <Menu className="size-5" strokeWidth={1.8} />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-72 flex-col border-r border-white/10 bg-[#0d1110] p-0"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Access all app pages.</SheetDescription>

                <Link to="/feed" className="border-b border-white/10 px-4 py-5">
                  <BrandLockup />
                </Link>

                <nav className={getSidebarNavClassName(true)}>
                  {mainNav.map((it) => (
                    <SheetClose asChild key={it.to}>
                      {renderNavItem(it, true)}
                    </SheetClose>
                  ))}
                  {staffNav.length > 0 && (
                    <>
                      {renderGroupLabel("Staff")}
                      <div className="mt-1 flex flex-col gap-1 px-0">
                        {staffNav.map((it) => (
                          <SheetClose asChild key={it.to}>
                            {renderNavItem(it, true)}
                          </SheetClose>
                        ))}
                      </div>
                    </>
                  )}
                </nav>

                <div className="mt-auto border-t border-white/10 px-3 pb-6 pt-4">
                  <div className="mb-2 truncate px-3 text-xs text-stone-400">{user?.email}</div>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-stone-300 hover:bg-white/[0.06] hover:text-stone-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 size-4" strokeWidth={1.8} />
                      Sign out
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/feed">
              <BrandLockup compact />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 bg-[linear-gradient(180deg,#0b0f0d_0%,#101412_45%,#090c0b_100%)] px-4 py-5 animate-fade-in sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
