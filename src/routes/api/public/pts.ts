import { createFileRoute } from "@tanstack/react-router";
import { getPublicPts, json } from "@/server/crm";

export const Route = createFileRoute("/api/public/pts")({
  server: {
    handlers: {
      GET: async () => json({ pts: await getPublicPts() }),
    },
  },
});
