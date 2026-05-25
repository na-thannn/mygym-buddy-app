import { createFileRoute } from "@tanstack/react-router";
import { parseRequestBody } from "@/lib/request-utils";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/debug-echo")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        try {
          const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
          const request = maybe.request ?? (ctx as unknown as Request);
          const body = await parseRequestBody(request as unknown);
          const reqAny = request as unknown as MaybeWrappedRequest;
          const meta = {
            hasRequestProp: !!reqAny.request,
            requestKeys: Object.keys(reqAny as Record<string, unknown>).slice(0, 20),
            bodyType: typeof reqAny?.body,
            reqJsonType: reqAny?.request && typeof (reqAny.request as unknown as Request).json,
            reqTextType: reqAny?.request && typeof (reqAny.request as unknown as Request).text,
          };
          return new Response(JSON.stringify({ ok: true, body, meta }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
