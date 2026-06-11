import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/log/nutrition-report")({
  head: () => ({ meta: [{ title: "Nutrition - HL Fitness" }] }),
  component: NutritionReportRedirect,
});

function NutritionReportRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/nutrition", replace: true });
  }, [navigate]);

  return <div className="p-6 text-sm text-slate-400">Redirecting to Nutrition...</div>;
}
