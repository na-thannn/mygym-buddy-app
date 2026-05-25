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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: typeof Activity };

const NAV: NavItem[] = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/inbody", label: "InBody", icon: Scale },
  { to: "/log/workout", label: "Workout", icon: Dumbbell },
  { to: "/nutrition", label: "Nutrition", icon: PieChart },
  { to: "/log/nutrition-report", label: "Nutrition Report", icon: FileText },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/progress-report", label: "Progress Report", icon: FileText },
  { to: "/trainer", label: "AI Coach", icon: MessageCircle },
  { to: "/plans", label: "Plans", icon: ClipboardList },
  { to: "/analyses", label: "AI Analyses", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Patch global fetch to include credentials by default so RPC and fetches send cookies
    // only patch once
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

  return (
    <div className="min-h-screen relative bg-[radial-gradient(circle_at_top,_#151a10,_#0a0c08_60%,_#050604_100%)] text-slate-100 dark">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 size-72 rounded-full bg-yellow-400/15 blur-3xl animate-float-soft" />
        <div className="absolute bottom-0 right-0 size-80 rounded-full bg-emerald-400/10 blur-3xl animate-float-soft" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row">
        <aside className="hidden md:flex w-64 shrink-0 border-r border-white/10 bg-black/40 backdrop-blur flex-col p-4 gap-1 sticky top-0 h-screen">
          <Link to="/feed" className="flex items-center gap-3 px-2 py-3 mb-2 animate-slide-in-left">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="size-9 rounded-xl object-cover animate-glow"
            />
            <div>
              <div className="font-semibold leading-none">HL Fitness</div>
              <div className="text-[10px] text-slate-300">with Alex AI</div>
            </div>
          </Link>
          {NAV.map((it) => {
            const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300",
                  "hover:-translate-y-0.5 hover:bg-yellow-400/10 hover:text-yellow-200",
                  active
                    ? "bg-yellow-400/15 text-yellow-200 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]"
                    : "text-slate-300",
                )}
              >
                <Icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="px-3 py-2 text-xs text-slate-400 truncate">{user?.email}</div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-200 hover:text-yellow-200 hover:bg-white/5"
              onClick={handleSignOut}
            >
              <LogOut className="size-4 mr-2" />
              Sign out
            </Button>
          </div>
        </aside>

        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-200">
                  <Menu className="size-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 bg-[#0a0c08] border-r border-white/10 p-0 flex flex-col"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Access all app pages.</SheetDescription>

                <Link
                  to="/feed"
                  className="flex items-center gap-3 px-4 py-5 border-b border-white/10"
                >
                  <img src="/logo.jpg" alt="Logo" className="size-9 rounded-xl object-cover" />
                  <div>
                    <div className="font-semibold leading-none text-slate-100">HL Fitness</div>
                    <div className="text-[10px] text-slate-400">with Alex AI</div>
                  </div>
                </Link>

                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                  {NAV.map((it) => {
                    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                    const Icon = it.icon;
                    return (
                      <SheetClose asChild key={it.to}>
                        <Link
                          to={it.to}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-300",
                            active
                              ? "bg-yellow-400/15 text-yellow-200 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]"
                              : "text-slate-300 hover:bg-white/5",
                          )}
                        >
                          <Icon className="size-5" />
                          {it.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 pb-6 px-3">
                  <div className="px-3 py-2 text-xs text-slate-400 truncate">{user?.email}</div>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-slate-200 hover:text-yellow-200 hover:bg-white/5"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4 mr-2" />
                      Sign out
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/feed" className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Logo" className="size-7 rounded-md object-cover" />
              <span className="font-semibold text-sm">HL Fitness</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 pb-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
