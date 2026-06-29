import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { estimateMacrosForMeals, estimateMealFromImage } from "@/lib/nutrition.functions";
import { isAiConfigured } from "@/lib/trainer/groq";
import { bucketMealByHour, saigonParts, type MealBucket } from "@/lib/time";
import type { MaybeWrappedRequest } from "@/types/dev";

type MacroTotals = { calories: number; proteinG: number; carbsG: number; fatsG: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

function clampNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function mealFieldPatch(bucket: MealBucket, value: string) {
  if (bucket === "breakfast") return { breakfast: value };
  if (bucket === "lunch") return { lunch: value };
  if (bucket === "dinner") return { dinner: value };
  return { snacks: value };
}

export const Route = createFileRoute("/api/feed/log-meal")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const postId = typeof bodyObj?.postId === "string" ? bodyObj.postId.trim() : "";
        if (!postId) return json({ error: "Missing postId" }, 400);

        try {
          const [post] = await db
            .select({
              id: schema.communityFeed.id,
              userId: schema.communityFeed.userId,
              content: schema.communityFeed.content,
              imageBase64: schema.communityFeed.imageBase64,
            })
            .from(schema.communityFeed)
            .where(eq(schema.communityFeed.id, postId))
            .limit(1);
          if (!post) return json({ error: "Post not found" }, 404);
          if (post.userId !== session.userId) {
            return json({ error: "You can only log your own posts" }, 403);
          }

          const text = (post.content ?? "").trim();
          const image = post.imageBase64;
          if (!text && !image) {
            return json({ error: "This post has nothing to analyse" }, 400);
          }

          const { date: today, hour } = saigonParts();
          const bucket = bucketMealByHour(hour);

          let mealName = text ? text.slice(0, 120) : "Meal";
          let macros: MacroTotals | null = null;

          if (isAiConfigured()) {
            try {
              if (image) {
                const result = await estimateMealFromImage({
                  imageDataUrl: image,
                  note: text || null,
                });
                if (result.name) mealName = result.name.slice(0, 120);
                macros = {
                  calories: clampNumber(result.calories),
                  proteinG: clampNumber(result.protein_g),
                  carbsG: clampNumber(result.carbs_g),
                  fatsG: clampNumber(result.fats_g),
                };
              } else {
                const meals =
                  bucket === "breakfast"
                    ? { breakfast: text }
                    : bucket === "lunch"
                      ? { lunch: text }
                      : bucket === "dinner"
                        ? { dinner: text }
                        : { snacks: text };
                const result = await estimateMacrosForMeals(meals);
                macros = {
                  calories: clampNumber(result.calories),
                  proteinG: clampNumber(result.protein_g),
                  carbsG: clampNumber(result.carbs_g),
                  fatsG: clampNumber(result.fats_g),
                };
              }
            } catch (err) {
              await logDevError({
                error: err,
                req: { method: "POST", url: "/api/feed/log-meal" },
              }).catch(() => {});
              macros = null;
            }
          }

          const [existing] = await db
            .select()
            .from(schema.nutritionReports)
            .where(
              and(
                eq(schema.nutritionReports.userId, session.userId),
                eq(schema.nutritionReports.reportDate, today),
              ),
            )
            .orderBy(desc(schema.nutritionReports.createdAt))
            .limit(1);

          if (existing) {
            const previous = existing[bucket];
            const merged = previous ? `${previous}; ${mealName}` : mealName;
            await db
              .update(schema.nutritionReports)
              .set({
                ...mealFieldPatch(bucket, merged),
                ...(macros
                  ? {
                      calories: (existing.calories ?? 0) + macros.calories,
                      proteinG: (existing.proteinG ?? 0) + macros.proteinG,
                      carbsG: (existing.carbsG ?? 0) + macros.carbsG,
                      fatsG: (existing.fatsG ?? 0) + macros.fatsG,
                    }
                  : {}),
              })
              .where(eq(schema.nutritionReports.id, existing.id));
          } else {
            await db.insert(schema.nutritionReports).values({
              id: newId(),
              userId: session.userId,
              reportDate: today,
              ...mealFieldPatch(bucket, mealName),
              ...(macros
                ? {
                    calories: macros.calories,
                    proteinG: macros.proteinG,
                    carbsG: macros.carbsG,
                    fatsG: macros.fatsG,
                  }
                : {}),
            });
          }

          const summary = macros
            ? `Logged "${mealName}" to ${bucket} for ${today}: about ${Math.round(macros.calories)} kcal, ${Math.round(macros.proteinG)}g protein, ${Math.round(macros.carbsG)}g carbs, ${Math.round(macros.fatsG)}g fat. Saved to your nutrition log.`
            : `Logged "${mealName}" to ${bucket} for ${today}. Add a Groq API key to estimate macros automatically.`;

          const commentId = newId();
          const createdAt = new Date().toISOString();
          await db.insert(schema.feedComments).values({
            id: commentId,
            postId,
            userId: session.userId,
            content: summary,
            isAgent: 1,
            macrosJson: macros ? JSON.stringify(macros) : null,
            createdAt,
          });

          return json({
            ok: true,
            bucket,
            macros,
            comment: {
              id: commentId,
              postId,
              userId: session.userId,
              content: summary,
              isAgent: 1,
              macrosJson: macros ? JSON.stringify(macros) : null,
              createdAt,
              authorName: "Alex",
            },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/log-meal" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
