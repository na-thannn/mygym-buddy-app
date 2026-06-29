import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { estimateInbodyFromImage } from "@/lib/inbody.functions";
import { isAiConfigured } from "@/lib/trainer/groq";
import type { MaybeWrappedRequest } from "@/types/dev";

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/inbody/scan")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const imageBase64 =
          typeof bodyObj?.imageBase64 === "string" ? bodyObj.imageBase64.trim() : "";
        if (!imageBase64) return json({ error: "Missing imageBase64" }, 400);

        if (!isAiConfigured()) {
          return json({
            ok: true,
            imageBase64,
            extracted: null,
            message: "Add a Groq API key to extract numbers from scans automatically.",
          });
        }

        try {
          const extracted = await estimateInbodyFromImage({ imageDataUrl: imageBase64 });
          return json({
            ok: true,
            imageBase64,
            extracted: {
              reportDate: extracted.reportDate ?? null,
              weightKg: extracted.weightKg,
              muscleMassKg: extracted.muscleMassKg,
              bodyFatPercent: extracted.bodyFatPercent,
            },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/inbody/scan" },
          }).catch(() => {});
          return json({
            ok: true,
            imageBase64,
            extracted: null,
            message: "Could not read the scan. Enter the numbers manually.",
          });
        }
      },
    },
  },
});
