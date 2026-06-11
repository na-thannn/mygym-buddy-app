import { createFileRoute } from "@tanstack/react-router";
import { getPublicPlans, getPublicPromotions, getPublicServices, json } from "@/server/crm";

export const Route = createFileRoute("/api/public/packages")({
  server: {
    handlers: {
      GET: async () =>
        json({
          plans: await getPublicPlans(),
          services: await getPublicServices(),
          promotions: await getPublicPromotions(),
        }),
    },
  },
});
