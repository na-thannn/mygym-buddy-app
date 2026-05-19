import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Apple, Dumbbell, LineChart, MapPin, MessageCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HL Fitness 303 Lê Thanh Nghị — Nền tảng tập luyện cùng AI Coach" },
      { name: "description", content: "Cộng đồng HL Fitness Đà Nẵng — theo dõi InBody, nhật ký tập & dinh dưỡng, AI Coach và HLV trực tuyến." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const features = [
    { icon: Scale, title: "Theo dõi InBody", desc: "Tải kết quả, xem biểu đồ tiến độ qua các lần đo." },
    { icon: Dumbbell, title: "Nhật ký tập", desc: "Ghi bài tập, sets, reps, mức tạ — xem PR mỗi tuần." },
    { icon: Apple, title: "Nhật ký dinh dưỡng", desc: "Ghi bữa ăn, calo, P/F/C. Hiểu rõ thói quen ăn." },
    { icon: MessageCircle, title: "AI Coach", desc: "Hỏi đáp về tập luyện, gen kế hoạch riêng. Cần là gọi HLV thật." },
    { icon: LineChart, title: "Phân tích tiến độ", desc: "Biểu đồ cân nặng, mỡ, cơ — biết bạn đang đi đúng hướng không." },
    { icon: Activity, title: "Cộng đồng phòng tập", desc: "Chia sẻ ảnh, cổ vũ nhau cùng các thành viên 303 Lê Thanh Nghị." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="font-bold leading-none">HL Fitness</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" /> 303 Lê Thanh Nghị, Đà Nẵng
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Đăng nhập</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>Tham gia</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs mb-6">
          <MapPin className="size-3" /> Dành riêng cho thành viên HL Fitness 303 Lê Thanh Nghị
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Tiến bộ mỗi ngày, <span className="text-primary">cùng cộng đồng</span> phòng tập.
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Ghi nhận InBody, nhật ký tập luyện & dinh dưỡng, trò chuyện với AI Coach và nhận hỗ trợ từ HLV
          khi cần — tất cả trong một nơi.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>Bắt đầu miễn phí</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">Đã có tài khoản</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
                  <Icon className="size-5" />
                </div>
                <div className="font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <div>© HL Fitness — 303 Lê Thanh Nghị, Đà Nẵng</div>
          <div>Nền tảng dành riêng cho thành viên & HLV của chi nhánh.</div>
        </div>
      </footer>
    </div>
  );
}
