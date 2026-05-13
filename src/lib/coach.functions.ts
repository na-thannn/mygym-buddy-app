import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const chatInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export const coachReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chatInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify thread ownership
    const { data: thread } = await supabase
      .from("coach_threads")
      .select("id, user_id, status")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread || thread.user_id !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    // Save user message
    await supabase.from("coach_messages").insert({
      thread_id: data.threadId,
      sender_role: "user",
      sender_id: userId,
      content: data.message,
    });

    // If thread is escalated to PT, don't generate AI response
    if (thread.status === "escalated") {
      return { ok: true, escalated: true };
    }

    // Gather user context
    const [{ data: profile }, { data: latestInbody }, { data: workouts }, { data: meals }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("display_name, gender, dob, height_cm, target_weight_kg, goal").eq("id", userId).maybeSingle(),
      supabase.from("inbody_entries").select("measured_at, weight_kg, body_fat_pct, skeletal_muscle_kg, bmi").eq("user_id", userId).order("measured_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("workout_logs").select("exercise, sets, reps, weight_kg, performed_at").eq("user_id", userId).order("performed_at", { ascending: false }).limit(15),
      supabase.from("meal_logs").select("name, calories, protein_g, eaten_at").eq("user_id", userId).order("eaten_at", { ascending: false }).limit(15),
      supabase.from("coach_messages").select("sender_role, content").eq("thread_id", data.threadId).order("created_at", { ascending: true }).limit(40),
    ]);

    const userCtx = {
      profile,
      latestInbody,
      recentWorkouts: workouts ?? [],
      recentMeals: meals ?? [],
    };

    const systemPrompt = `Bạn là AI Coach của HL Fitness 303 Lê Thanh Nghị (Đà Nẵng). Trả lời bằng tiếng Việt, ngắn gọn, thân thiện, dùng markdown khi cần (danh sách, in đậm).
Bạn có thể:
- Tư vấn tập luyện và dinh dưỡng dựa trên dữ liệu của thành viên
- Soạn kế hoạch tập theo tuần khi được yêu cầu
- Khi vấn đề vượt khả năng (chấn thương, bệnh lý, dinh dưỡng đặc biệt), khuyên thành viên bấm "Nhờ PT hỗ trợ" để gặp HLV thật.

THÔNG TIN THÀNH VIÊN (JSON):
${JSON.stringify(userCtx, null, 2)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...((history ?? []).map((m) => ({
        role: m.sender_role === "user" ? "user" : "assistant",
        content: m.content,
      }))),
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      const fallback = "Xin lỗi, AI Coach hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc nhờ PT hỗ trợ.";
      await supabase.from("coach_messages").insert({
        thread_id: data.threadId, sender_role: "ai", content: fallback,
      });
      return { ok: true, content: fallback };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI gateway error", res.status, errText);
      const fallback = res.status === 429
        ? "Hiện đang quá tải, bạn thử lại sau ít phút nhé."
        : res.status === 402
          ? "Tài khoản AI hết credit. Vui lòng liên hệ admin."
          : "Có lỗi khi gọi AI. Bạn thử lại sau nhé.";
      await supabase.from("coach_messages").insert({
        thread_id: data.threadId, sender_role: "ai", content: fallback,
      });
      return { ok: false, content: fallback };
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "Xin lỗi, mình chưa có câu trả lời.";

    await supabase.from("coach_messages").insert({
      thread_id: data.threadId, sender_role: "ai", content,
    });
    await supabase.from("coach_threads").update({ updated_at: new Date().toISOString() }).eq("id", data.threadId);

    return { ok: true, content };
  });