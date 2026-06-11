import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MagneticTarget,
  OptimizedPicture,
  SpotlightSurface,
} from "@/components/motion/public-funnel-motion";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" : "login",
    redirect: (s.redirect as string) || "/trainer",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: AuthPage,
});

function AuthPage() {
  const reduceMotion = useReducedMotion();
  const { mode, redirect, email } = Route.useSearch();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const doSignIn = async (payload: { data: { email: string; password: string } }) => {
    const res = await fetch("/api/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Sign in failed");
    }
    return res.json();
  };

  useEffect(() => {
    if (!loading && user) navigate({ to: redirect });
  }, [user, loading, redirect, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doSignIn({
        data: { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") },
      });
      await refresh();
      toast.success("Signed in successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050806] text-stone-50 dark">
      <div className="absolute inset-0">
        <OptimizedPicture
          src="/redesign/community-training.png"
          alt="HL Fitness members training together"
          className="opacity-80 saturate-[1.05]"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(103deg,rgba(5,8,6,0.28)_0%,rgba(5,8,6,0.48)_34%,rgba(5,8,6,0.82)_58%,#050806_78%,#050806_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_44%,rgba(244,179,43,0.1),transparent_32%)]" />
        <div className="funnel-grid absolute inset-0 opacity-15" />
      </div>

      <main className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_0.78fr] lg:px-8">
        <motion.section
          className="hidden max-w-xl lg:block"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <BadgeCheck className="mb-5 size-10 text-primary" strokeWidth={1.8} />
          <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight">
            Your member tools stay close.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-300">
            Sign in to reach workouts, plans, coach chat, InBody records, and progress reports.
          </p>
          <div className="mt-8 grid max-w-md gap-3 border-l border-primary/50 pl-4 text-sm leading-6 text-stone-300">
            <span>HL Fitness</span>
            <span>303 Le Thanh Nghi</span>
          </div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-md lg:mr-0"
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="mb-8 flex items-center justify-center gap-3 lg:justify-start">
            <img src="/logo.jpg" alt="Logo" className="size-10 rounded-lg object-cover" />
            <div>
              <div className="text-sm font-semibold tracking-tight">HL Fitness Alex AI</div>
              <div className="mt-1 text-xs text-stone-500">303 Le Thanh Nghi</div>
            </div>
          </Link>

          <SpotlightSurface className="funnel-panel rounded-2xl bg-[#111612] p-5 sm:p-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-50">Sign in</h1>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Use the account your coach sent after your HL Fitness meeting.
              </p>
            </div>

            {mode === "signup" && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-stone-200">
                Guests cannot create accounts directly. Request a coach meeting first, then your
                coach can send a login if you join.
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="li-email" className="text-stone-200">
                  Email
                </Label>
                <Input
                  id="li-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={email}
                  className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50 placeholder:text-stone-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="li-pw" className="text-stone-200">
                  Password
                </Label>
                <Input
                  id="li-pw"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50"
                />
              </div>
              <MagneticTarget className="w-full">
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground transition duration-200 hover:bg-primary/90 active:scale-[0.98]"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Sign in
                </Button>
              </MagneticTarget>
            </form>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-semibold text-stone-50">Need an account?</div>
              <p className="mt-1 text-xs leading-5 text-stone-400">
                Request a coach meeting first. If you join, your coach sends your temporary login by
                email.
              </p>
              <MagneticTarget>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-10 rounded-xl border-white/15 bg-white/[0.04] text-stone-50 transition duration-200 hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <Link to="/get-started">
                    Get started <ArrowRight className="ml-2 size-4" strokeWidth={1.8} />
                  </Link>
                </Button>
              </MagneticTarget>
            </div>
          </SpotlightSurface>

          <div className="mt-6 text-center">
            <Button
              asChild
              variant="ghost"
              className="rounded-xl text-stone-400 hover:bg-white/[0.06] hover:text-stone-100"
            >
              <Link to="/">
                <ArrowLeft className="mr-2 size-4" strokeWidth={1.8} />
                Back to home
              </Link>
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
