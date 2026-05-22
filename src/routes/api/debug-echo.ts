import { createFileRoute } from '@tanstack/react-router'
import { parseRequestBody } from '@/lib/request-utils'

export const Route = createFileRoute('/api/debug-echo')({
  server: {
    handlers: {
      POST: async (request: any) => {
        try {
          const body = await parseRequestBody(request);
          const meta = {
            hasRequestProp: !!request.request,
            requestKeys: Object.keys(request).slice(0, 20),
            bodyType: typeof request?.body,
            reqJsonType: request?.request && typeof request.request.json,
            reqTextType: request?.request && typeof request.request.text,
          };
          return new Response(JSON.stringify({ ok: true, body, meta }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
