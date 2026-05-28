import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { estimateMacrosForMeals } from "@/lib/nutrition.functions";
import logDevError from "@/lib/error-logger";

export const Route = createFileRoute("/api/log/nutrition-report")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
          .select()
          .from(schema.nutritionReports)
          .where(eq(schema.nutritionReports.userId, session.userId))
          .orderBy(desc(schema.nutritionReports.reportDate))
          .limit(50)
          .all();
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

        const reportDate = (bodyObj["reportDate"] ?? bodyObj["date"] ?? null) as string | null;
        if (!reportDate) {
          return new Response(JSON.stringify({ error: "Missing reportDate" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const toText = (value: unknown) =>
          typeof value === "string" ? value.trim() || null : value == null ? null : String(value);
        const toNumber = (value: unknown) => {
          if (typeof value === "number") return Number.isFinite(value) ? value : null;
          if (value == null || value === "") return null;
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        };
        const toBoolean = (value: unknown, fallback: boolean) => {
          if (value == null) return fallback;
          if (typeof value === "boolean") return value;
          if (typeof value === "number") return value !== 0;
          if (typeof value === "string") {
            const v = value.toLowerCase();
            if (v === "false" || v === "0" || v === "no") return false;
            if (v === "true" || v === "1" || v === "yes") return true;
          }
          return fallback;
        };

        const dayType = toText(bodyObj["dayType"]);
        const breakfast = toText(bodyObj["breakfast"]);
        const lunch = toText(bodyObj["lunch"]);
        const dinner = toText(bodyObj["dinner"]);
        const snacks = toText(bodyObj["snacks"]);
        const preWorkoutMeal = toText(bodyObj["preWorkoutMeal"]);
        const postWorkoutMeal = toText(bodyObj["postWorkoutMeal"]);
        const notes = toText(bodyObj["notes"]);

        const estimateMacros = toBoolean(bodyObj["estimateMacros"], true);
        const manualMacros = {
          calories: toNumber(bodyObj["calories"]),
          proteinG: toNumber(bodyObj["proteinG"] ?? bodyObj["protein_g"]),
          carbsG: toNumber(bodyObj["carbsG"] ?? bodyObj["carbs_g"]),
          fatsG: toNumber(bodyObj["fatsG"] ?? bodyObj["fats_g"]),
        };

        let macros: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fats_g: number;
        } | null = null;
        if (estimateMacros) {
          try {
            macros = await estimateMacrosForMeals({
              breakfast,
              lunch,
              dinner,
              snacks,
              preWorkoutMeal,
              postWorkoutMeal,
            });
          } catch (err) {
            await logDevError({ error: err, req: null }).catch(() => {});
          }
        }

        const resolvedMacros = {
          calories: macros?.calories ?? manualMacros.calories ?? null,
          proteinG: macros?.protein_g ?? manualMacros.proteinG ?? null,
          carbsG: macros?.carbs_g ?? manualMacros.carbsG ?? null,
          fatsG: macros?.fats_g ?? manualMacros.fatsG ?? null,
        };

        const id = newId();
        try {
          db.insert(schema.nutritionReports)
            .values({
              id,
              userId: session.userId,
              reportDate,
              dayType,
              breakfast,
              lunch,
              dinner,
              snacks,
              preWorkoutMeal,
              postWorkoutMeal,
              notes,
              calories: resolvedMacros.calories,
              proteinG: resolvedMacros.proteinG,
              carbsG: resolvedMacros.carbsG,
              fatsG: resolvedMacros.fatsG,
            })
            .run();
          const hasMacros = Object.values(resolvedMacros).some((v) => typeof v === "number");
          return new Response(
            JSON.stringify({ ok: true, id, macros: hasMacros ? resolvedMacros : null }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/log/nutrition-report", body: bodyObj },
          }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
