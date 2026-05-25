import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { useAuth } from "@/lib/authContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — HL Fitness" }] }),
  component: ProfilePage,
});

type Form = {
  goal: string;
  level: string;
  limitations: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
};

const EMPTY: Form = {
  goal: "",
  level: "",
  limitations: "",
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
};

function ProfilePage() {
  const { user } = useAuth();
  const [f, setF] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const fetchProfile = async () => {
    const res = await fetch("/api/profile", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  };

  const doSave = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/profile", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json();
  };

  useEffect(() => {
    fetchProfile().then((p) => {
      if (p) {
        setF({
          goal: p.goal ?? "",
          level: p.level ?? "",
          limitations: p.limitations ?? "",
          age: p.age?.toString() ?? "",
          gender: p.gender ?? "",
          heightCm: p.heightCm?.toString() ?? "",
          weightKg: p.weightKg?.toString() ?? "",
          targetWeightKg: p.targetWeightKg?.toString() ?? "",
        });
      }
      setLoaded(true);
    });
  }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const num = (s: string) => (s ? Number(s) : null);
    try {
      await doSave({
        data: {
          goal: f.goal || null,
          level: f.level || null,
          limitations: f.limitations || null,
          age: num(f.age),
          gender: f.gender || null,
          heightCm: num(f.heightCm),
          weightKg: num(f.weightKg),
          targetWeightKg: num(f.targetWeightKg),
        },
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="p-6 text-sm text-slate-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Profile" subtitle={`Signed in as ${user?.email ?? ""}`} />
      <form
        onSubmit={save}
        className="space-y-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-5 animate-fade-up"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Goal</Label>
            <Input
              value={f.goal}
              onChange={(e) => setF({ ...f, goal: e.target.value })}
              placeholder="Fat loss, lean mass, performance"
            />
          </div>
          <div className="space-y-1">
            <Label>Level</Label>
            <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Age</Label>
            <Input
              type="number"
              value={f.age}
              onChange={(e) => setF({ ...f, age: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Height (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={f.heightCm}
              onChange={(e) => setF({ ...f, heightCm: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={f.weightKg}
              onChange={(e) => setF({ ...f, weightKg: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Target weight (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={f.targetWeightKg}
              onChange={(e) => setF({ ...f, targetWeightKg: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Limitations or injuries</Label>
          <Textarea
            rows={2}
            maxLength={500}
            value={f.limitations}
            onChange={(e) => setF({ ...f, limitations: e.target.value })}
            placeholder="Lower back pain, shoulder issue"
          />
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
        >
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save profile
        </Button>
      </form>
    </div>
  );
}
