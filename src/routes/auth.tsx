import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { signIn, signUp } from "@/lib/auth.functions";
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
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const doSignIn = useServerFn(signIn);
  const doSignUp = useServerFn(signUp);

  useEffect(() => {
    if (!loading && user) navigate({ to: redirect });
  }, [user, loading, redirect, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doSignIn({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        },
      });
      await refresh();
      toast.success("Đăng nhập thành công");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doSignUp({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          displayName: String(fd.get("displayName") ?? ""),
        },
      });
      await refresh();
      toast.success("Đã tạo tài khoản");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <Activity className="size-5" />
          </div>
          <div className="font-bold">HL Fitness · Alex AI</div>
        </Link>
        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs defaultValue={mode}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Đăng nhập</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Đăng ký</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="li-pw">Mật khẩu</Label>
                  <Input id="li-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Đăng nhập
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="su-name">Tên hiển thị</Label>
                  <Input id="su-name" name="displayName" required minLength={1} maxLength={60} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-pw">Mật khẩu</Label>
                  <Input id="su-pw" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Tạo tài khoản
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center mt-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
