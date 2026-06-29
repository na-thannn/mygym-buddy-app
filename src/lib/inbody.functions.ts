import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { ALEX_VISION_MODEL_ID, getModelProvider } from "./trainer/groq";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const inputSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive(),
  muscleMassKg: z.number().positive(),
  bodyFatPercent: z.number().positive(),
  imageBase64: z.string().optional().nullable(),
  source: z.enum(["manual", "scan"]).optional(),
});

const inbodyVisionSchema = z.object({
  reportDate: z.string().optional().nullable(),
  weightKg: z.number(),
  muscleMassKg: z.number(),
  bodyFatPercent: z.number(),
});

export async function estimateInbodyFromImage(input: { imageDataUrl: string }) {
  const provider = getModelProvider();
  const { object } = await generateObject({
    model: provider(ALEX_VISION_MODEL_ID),
    schema: inbodyVisionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "You are reading an InBody body composition report from a photo or scan. Return a JSON object with weightKg, muscleMassKg, bodyFatPercent (numbers), and optional reportDate (YYYY-MM-DD if visible).",
          },
          { type: "image", image: input.imageDataUrl },
        ],
      },
    ],
  });
  return object;
}

export const saveInbodyReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");

    const id = newId();
    try {
      await db.insert(schema.inbodyReports).values({ id, userId: session.userId, ...data });
      return { ok: true, id };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

export const listInbodyReports = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const { db, schema } = await import("@/server/db");

  return await db
    .select()
    .from(schema.inbodyReports)
    .where(eq(schema.inbodyReports.userId, session.userId))
    .orderBy(desc(schema.inbodyReports.reportDate));
});
