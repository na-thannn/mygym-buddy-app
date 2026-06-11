import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change Password - HL Fitness" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Password update failed");
      await refresh();
      toast.success("Password changed");
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-4 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Change password"
        subtitle="Set your own password before using your member account."
      />
      <form
        onSubmit={save}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#111612]/95 p-5"
      >
        <div className="grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
          <KeyRound className="size-6" strokeWidth={1.8} />
        </div>
        <Field label="Temporary password">
          <Input
            required
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50"
          />
        </Field>
        <Field label="New password">
          <Input
            required
            name="newPassword"
            type="password"
            minLength={6}
            autoComplete="new-password"
            className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50"
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            required
            name="confirmPassword"
            type="password"
            minLength={6}
            autoComplete="new-password"
            className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50"
          />
        </Field>
        <Button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save password
        </Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-stone-200">{label}</Label>
      {children}
    </div>
  );
}
