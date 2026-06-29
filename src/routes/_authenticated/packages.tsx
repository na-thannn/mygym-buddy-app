import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, Sparkles } from "lucide-react";
import { AccessDenied } from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Packages - HL Fitness" }] }),
  component: PackagesPage,
});

type Plan = {
  id: string;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  priceVnd: number;
  durationDays: number;
  includesPtSessions: number;
};

type Promotion = {
  id: string;
  titleEn: string;
  bonusTermsEn: string;
};

type Service = {
  id: string;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  category: string;
  priceVnd: number;
  durationMinutes: number;
};

type Membership = {
  id: string;
  planId: string | null;
  status: string;
  runtimeStatus?: string;
  startsOn: string;
  endsOn: string;
};

function PackagesPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [requests, setRequests] = useState<
    Array<{ id: string; status: string; planId: string | null; serviceOfferingId: string | null }>
  >([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const [packagesRes, requestRes, membershipRes] = await Promise.all([
      fetch("/api/public/packages"),
      fetch("/api/customer/package-requests", { credentials: "include" }),
      fetch("/api/customer/memberships", { credentials: "include" }),
    ]);
    if (packagesRes.ok) {
      const payload = await packagesRes.json();
      setPlans(payload.plans ?? []);
      setServices(payload.services ?? []);
      setPromotions(payload.promotions ?? []);
    }
    if (requestRes.ok) setRequests((await requestRes.json()).requests ?? []);
    if (membershipRes.ok) setMemberships((await membershipRes.json()).memberships ?? []);
  };

  useEffect(() => {
    load().catch(() => toast.error("Unable to load packages"));
  }, []);

  const requestPlan = async (planId: string) => {
    setBusyId(planId);
    try {
      const res = await fetch("/api/customer/package-requests", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId,
          contactPhone,
          message: "Customer requested this package from the member app.",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Request failed");
      toast.success("Request sent to manager");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  };

  const requestService = async (serviceOfferingId: string) => {
    setBusyId(serviceOfferingId);
    try {
      const res = await fetch("/api/customer/package-requests", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceOfferingId,
          contactPhone,
          message: "Customer requested this PT service from the member app.",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Request failed");
      toast.success("Request sent to manager");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  };

  if (!user || user.role !== "customer") {
    return <AccessDenied title="Customer access required" />;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Packages"
        subtitle="Review public HL Fitness plans, promotions, and your package requests."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Active membership</h2>
          <div className="mt-3 space-y-2">
            {memberships.length === 0 && (
              <div className="text-sm text-slate-400">No active membership found.</div>
            )}
            {memberships.map((membership) => (
              <div key={membership.id} className="rounded-xl bg-white/[0.05] p-3">
                <div className="font-medium text-slate-100">
                  {membership.runtimeStatus ?? membership.status}
                </div>
                <div className="text-sm text-slate-400">
                  {membership.startsOn} to {membership.endsOn}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Manager follow-up</h2>
          <Input
            className="mt-3"
            placeholder="Phone for manager callback"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            {requests.slice(0, 4).map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-3">
                <span>{request.planId ?? request.serviceOfferingId ?? "Service request"}</span>
                <span className="text-primary">{request.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {promotions.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
              <Sparkles className="mb-3 size-5 text-primary" strokeWidth={1.8} />
              <div className="font-semibold text-slate-100">{promotion.titleEn}</div>
              <p className="mt-1 text-sm text-slate-300">{promotion.bonusTermsEn}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.id}
            className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#111612] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-primary">
                  {plan.durationDays} days
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-100">
                  {plan.nameEn}
                </h2>
              </div>
              <CreditCard className="size-5 shrink-0 text-primary" strokeWidth={1.8} />
            </div>
            <div className="mt-4 text-xl font-semibold tracking-tight tabular-nums text-slate-50">
              {formatVnd(plan.priceVnd)}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{plan.descriptionEn}</p>
            <div className="mt-3 min-h-5 text-xs font-medium text-primary">
              {plan.includesPtSessions > 0 ? `${plan.includesPtSessions} PT sessions` : null}
            </div>
            <div className="mt-auto pt-5">
              <Button
                className="h-10 w-full"
                disabled={busyId === plan.id}
                onClick={() => requestPlan(plan.id)}
              >
                Request package
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Button>
            </div>
          </section>
        ))}
      </div>

      {services.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-100">PT services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <section
                key={service.id}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#111612] p-5"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-primary">
                  {service.category} / {service.durationMinutes} min
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-100">
                  {service.nameEn}
                </h3>
                <div className="mt-4 text-xl font-semibold tracking-tight tabular-nums text-slate-50">
                  {formatVnd(service.priceVnd)}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {service.descriptionEn}
                </p>
                <div className="mt-auto pt-5">
                  <Button
                    className="h-10 w-full"
                    disabled={busyId === service.id}
                    onClick={() => requestService(service.id)}
                  >
                    Request service
                    <ArrowRight className="size-4" strokeWidth={1.8} />
                  </Button>
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} VND`;
}
