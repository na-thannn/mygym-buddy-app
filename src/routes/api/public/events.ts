import { createFileRoute } from "@tanstack/react-router";
import { getPublicEvents, json } from "@/server/crm";

export const Route = createFileRoute("/api/public/events")({
  server: {
    handlers: {
      GET: async () => json({ events: await getPublicEvents() }),
    },
  },
});
