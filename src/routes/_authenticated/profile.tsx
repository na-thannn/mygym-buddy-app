import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ — HL Fitness" }] }),
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
  const fetchProfile = useServerFn(getProfile);
  const doSave = useServerFn(saveProfile);

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
  }, [fetchProfile]);

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
      toast.success("Đã lưu hồ sơ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Hồ sơ" subtitle={`Đăng nhập: ${user?.email ?? ""}`} />
      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Mục tiêu</Label>
            <Input value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} placeholder="vd: Giảm mỡ, tăng cơ" />
          </div>
          <div className="space-y-1">
            <Label>Trình độ</Label>
            <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tuổi</Label>
            <Input type="number" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Giới tính</Label>
            <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Nam</SelectItem>
                <SelectItem value="female">Nữ</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Chiều cao (cm)</Label>
            <Input type="number" step="0.1" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Cân nặng (kg)</Label>
            <Input type="number" step="0.1" value={f.weightKg} onChange={(e) => setF({ ...f, weightKg: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Cân nặng mục tiêu (kg)</Label>
            <Input type="number" step="0.1" value={f.targetWeightKg} onChange={(e) => setF({ ...f, targetWeightKg: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Hạn chế / chấn thương</Label>
          <Textarea rows={2} maxLength={500} value={f.limitations} onChange={(e) => setF({ ...f, limitations: e.target.value })} placeholder="vd: đau lưng dưới" />
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Lưu hồ sơ
        </Button>
      </form>
    </div>
  );
}
