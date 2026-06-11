import { createFileRoute } from "@tanstack/react-router";
import { getPublicLandingContent, json } from "@/server/crm";

export const Route = createFileRoute("/api/public/landing")({
  server: {
    handlers: {
      GET: async () => json(await getPublicLandingContent()),
    },
  },
});
