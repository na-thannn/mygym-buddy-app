import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ — HL Fitness" }] }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  dob: string | null;
  gender: string | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  goal: string | null;
  bio: string | null;
  level: string | null;
  limitations: string | null;
};

function ProfilePage() {
  const { user, role, refreshRole } = useAuth();
  const [p, setP] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [ptStatus, setPtStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data));
    supabase
      .from("pt_applications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setPtStatus(data?.status ?? null));
  }, [user]);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !p) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: p.display_name,
      dob: p.dob,
      gender: p.gender,
      height_cm: p.height_cm,
      target_weight_kg: p.target_weight_kg,
      goal: p.goal,
      bio: p.bio,
      level: p.level,
      limitations: p.limitations,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Đã lưu hồ sơ");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl + `?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setP((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    toast.success("Đã cập nhật ảnh đại diện");
  };

  const applyPT = async () => {
    if (!user) return;
    const message = prompt("Lời nhắn cho admin (kinh nghiệm, chứng chỉ…)") ?? "";
    const { error } = await supabase.from("pt_applications").upsert({
      user_id: user.id,
      message,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else {
      setPtStatus("pending");
      toast.success("Đã gửi yêu cầu trở thành PT");
    }
  };

  if (!p) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Hồ sơ" subtitle="Thông tin cá nhân và mục tiêu của bạn" />

      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            <AvatarImage src={p.avatar_url ?? undefined} />
            <AvatarFallback>{p.display_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <label className="text-sm text-primary cursor-pointer hover:underline">
            Đổi ảnh đại diện
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Tên hiển thị</Label>
            <Input
              value={p.display_name ?? ""}
              onChange={(e) => setP({ ...p, display_name: e.target.value })}
              maxLength={60}
            />
          </div>
          <div className="space-y-1">
            <Label>Ngày sinh</Label>
            <Input type="date" value={p.dob ?? ""} onChange={(e) => setP({ ...p, dob: e.target.value || null })} />
          </div>
          <div className="space-y-1">
            <Label>Giới tính</Label>
            <Select value={p.gender ?? ""} onValueChange={(v) => setP({ ...p, gender: v })}>
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
            <Input
              type="number"
              step="0.1"
              value={p.height_cm ?? ""}
              onChange={(e) => setP({ ...p, height_cm: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Cân nặng mục tiêu (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={p.target_weight_kg ?? ""}
              onChange={(e) => setP({ ...p, target_weight_kg: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1">
            <Label>Mục tiêu</Label>
            <Select value={p.goal ?? ""} onValueChange={(v) => setP({ ...p, goal: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn mục tiêu" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose_fat">Giảm mỡ</SelectItem>
                <SelectItem value="gain_muscle">Tăng cơ</SelectItem>
                <SelectItem value="maintain">Duy trì</SelectItem>
                <SelectItem value="strength">Tăng sức mạnh</SelectItem>
                <SelectItem value="endurance">Sức bền</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Trình độ tập</Label>
            <Select value={p.level ?? ""} onValueChange={(v) => setP({ ...p, level: v })}>
              <SelectTrigger><SelectValue placeholder="Chọn trình độ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Người mới (Beginner)</SelectItem>
                <SelectItem value="intermediate">Trung cấp (Intermediate)</SelectItem>
                <SelectItem value="advanced">Nâng cao (Advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Hạn chế / Chấn thương</Label>
          <Textarea
            value={p.limitations ?? ""}
            onChange={(e) => setP({ ...p, limitations: e.target.value })}
            rows={2}
            maxLength={300}
            placeholder="VD: đau lưng dưới, không squat nặng. Nếu không có, ghi 'không'."
          />
        </div>

        <div className="space-y-1">
          <Label>Giới thiệu</Label>
          <Textarea
            value={p.bio ?? ""}
            onChange={(e) => setP({ ...p, bio: e.target.value })}
            rows={3}
            maxLength={300}
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Lưu thay đổi
        </Button>
      </form>

      <div className="mt-10 pt-6 border-t border-border">
        <h2 className="font-semibold">Vai trò</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bạn đang là: <span className="font-medium text-foreground">{role === "admin" ? "Quản trị viên" : role === "pt" ? "Huấn luyện viên" : "Thành viên"}</span>
        </p>
        {role === "user" && (
          <div className="mt-3">
            {ptStatus === "pending" ? (
              <p className="text-sm text-muted-foreground">Yêu cầu trở thành PT đang chờ admin duyệt.</p>
            ) : ptStatus === "approved" ? (
              <p className="text-sm text-muted-foreground">Đã duyệt — vui lòng đăng xuất rồi đăng nhập lại để cập nhật.</p>
            ) : ptStatus === "rejected" ? (
              <p className="text-sm text-destructive">Yêu cầu bị từ chối. Liên hệ admin.</p>
            ) : (
              <Button variant="outline" size="sm" onClick={applyPT}>Đăng ký làm Huấn luyện viên</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}