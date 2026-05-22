import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" : "login",
    redirect: (s.redirect as string) || "/trainer",
    email: typeof s.email === "string" ? s.email : "",
  }),
  component: AuthPage,
});

function AuthPage() {
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

  const doSignUp = async (payload: { data: { email: string; password: string; displayName: string } }) => {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Sign up failed");
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
      await doSignIn({ data: { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") } });
      await refresh();
      toast.success("Signed in successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doSignUp({ data: { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), displayName: String(fd.get("displayName") ?? "") } });
      await refresh();
      toast.success("Account created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen dark bg-[radial-gradient(circle_at_top,_#1b1f14,_#0f120c_55%,_#090b07_100%)] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <Link to="/" className="flex items-center gap-3 justify-center mb-6">
          <img src="/logo.jpg" alt="Logo" className="size-10 rounded-xl object-cover animate-glow" />
          <div className="font-semibold tracking-wide">HL Fitness · Alex AI</div>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur p-6 shadow-xl">
          <Tabs defaultValue={mode}>
            <TabsList className="w-full bg-white/10 border border-white/10">
              <TabsTrigger value="login" className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-950">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-950">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" defaultValue={email} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="li-pw">Password</Label>
                  <Input id="li-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="su-name">Display name</Label>
                  <Input id="su-name" name="displayName" required minLength={1} maxLength={60} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" defaultValue={email} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center mt-6">
          <Button asChild variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-white/5">
            <Link to="/">
              ← Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
