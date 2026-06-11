import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarCheck, CalendarOff, Headphones, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/authContext";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Manager CRM - HL Fitness" }] }),
  component: StaffPage,
});

type Ticket = {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  assignedManagerId?: string | null;
  assignedPtId?: string | null;
  createdAt: string;
};

type Booking = {
  id: string;
  customerId: string;
  ptId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

type Customer = {
  id: string;
  displayName: string;
  email: string;
  assignedPtId?: string | null;
  canViewFitness: boolean;
};

type PtOption = {
  id: string;
  displayName: string;
  email: string;
};

type GuestMeeting = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  goal: string;
  experience: string;
  requestedPtId?: string | null;
  assignedPtId?: string | null;
  scheduledAt: string;
  usedFallback: number;
  status: string;
  createdUserId?: string | null;
};

type UnavailableDay = {
  id: string;
  ptId: string;
  unavailableDate: string;
  reason?: string | null;
};

type CrmPlan = {
  id: string;
  nameEn: string;
  nameVi: string;
  audience: string;
  priceVnd: number;
  durationDays: number;
  bonusDays: number;
  includesPtSessions: number;
  active: number;
  isPublic: number;
};

type CrmService = {
  id: string;
  nameEn: string;
  nameVi: string;
  category: string;
  priceVnd: number;
  durationMinutes: number;
  active: number;
  isPublic: number;
};

type CrmPromotion = {
  id: string;
  titleEn: string;
  titleVi: string;
  bonusTermsEn: string;
  bonusTermsVi: string;
  active: number;
  isPublic: number;
};

type CrmEvent = {
  id: string;
  titleEn: string;
  titleVi: string;
  eventType: string;
  active: number;
  isPublic: number;
};

type PurchaseRequest = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId?: string | null;
  serviceOfferingId?: string | null;
  status: string;
  message?: string | null;
  contactPhone?: string | null;
  requestedStartDate?: string | null;
};

type Membership = {
  id: string;
  customerId: string;
  planId?: string | null;
  status: string;
  startsOn: string;
  endsOn: string;
  priceVndAtPurchase: number;
};

type ManualPayment = {
  id: string;
  customerId: string;
  membershipId?: string | null;
  purchaseRequestId?: string | null;
  amountVnd: number;
  method: string;
  status: string;
  paidOn: string;
};

function StaffPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pts, setPts] = useState<PtOption[]>([]);
  const [guestMeetings, setGuestMeetings] = useState<GuestMeeting[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<UnavailableDay[]>([]);
  const [crmPlans, setCrmPlans] = useState<CrmPlan[]>([]);
  const [crmServices, setCrmServices] = useState<CrmService[]>([]);
  const [crmPromotions, setCrmPromotions] = useState<CrmPromotion[]>([]);
  const [crmEvents, setCrmEvents] = useState<CrmEvent[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPayment[]>([]);
  const [filter, setFilter] = useState("");
  const [unavailableDate, setUnavailableDate] = useState("");
  const [unavailablePtId, setUnavailablePtId] = useState("");
  const [membershipForm, setMembershipForm] = useState({
    customerId: "",
    planId: "",
    startsOn: todayString(),
    endsOn: addDaysString(30),
    priceVndAtPurchase: "200000",
  });
  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    membershipId: "",
    purchaseRequestId: "",
    amountVnd: "200000",
    method: "cash",
    paidOn: todayString(),
  });
  const [planForm, setPlanForm] = useState({
    nameEn: "",
    nameVi: "",
    audience: "general",
    priceVnd: "200000",
    durationDays: "30",
  });
  const [serviceForm, setServiceForm] = useState({
    nameEn: "",
    nameVi: "",
    category: "training",
    priceVnd: "0",
    durationMinutes: "60",
  });
  const [promoForm, setPromoForm] = useState({
    titleEn: "",
    titleVi: "",
    bonusTermsEn: "",
    bonusTermsVi: "",
  });
  const [eventForm, setEventForm] = useState({
    titleEn: "",
    titleVi: "",
    eventType: "promotion",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        supportRes,
        bookingRes,
        customerRes,
        ptsRes,
        guestRes,
        unavailableRes,
        plansRes,
        servicesRes,
        promosRes,
        eventsRes,
        requestRes,
        membershipRes,
        paymentRes,
      ] =
        await Promise.all([
          fetch("/api/support", { credentials: "include" }),
          fetch("/api/bookings", { credentials: "include" }),
          fetch("/api/customers", { credentials: "include" }),
          fetch("/api/pts", { credentials: "include" }),
          fetch("/api/guest-meetings", { credentials: "include" }),
          fetch("/api/pt-unavailable-days", { credentials: "include" }),
          fetch("/api/manager/packages", { credentials: "include" }),
          fetch("/api/manager/services", { credentials: "include" }),
          fetch("/api/manager/promotions", { credentials: "include" }),
          fetch("/api/manager/events", { credentials: "include" }),
          fetch("/api/manager/purchase-requests", { credentials: "include" }),
          fetch("/api/manager/memberships", { credentials: "include" }),
          fetch("/api/manager/payments", { credentials: "include" }),
        ]);
      if (
        !supportRes.ok ||
        !bookingRes.ok ||
        !customerRes.ok ||
        !ptsRes.ok ||
        !guestRes.ok ||
        !unavailableRes.ok ||
        !plansRes.ok ||
        !servicesRes.ok ||
        !promosRes.ok ||
        !eventsRes.ok ||
        !requestRes.ok ||
        !membershipRes.ok ||
        !paymentRes.ok
      ) {
        throw new Error("Unable to load manager data");
      }
      setTickets((await supportRes.json()).tickets ?? []);
      setBookings(await bookingRes.json());
      const customerPayload = await customerRes.json();
      setCustomers(customerPayload.customers ?? []);
      const ptPayload = await ptsRes.json();
      setPts(ptPayload.pts ?? []);
      setGuestMeetings((await guestRes.json()).meetings ?? []);
      setUnavailableDays((await unavailableRes.json()).days ?? []);
      setCrmPlans((await plansRes.json()).plans ?? []);
      setCrmServices((await servicesRes.json()).services ?? []);
      setCrmPromotions((await promosRes.json()).promotions ?? []);
      setCrmEvents((await eventsRes.json()).events ?? []);
      setPurchaseRequests((await requestRes.json()).requests ?? []);
      setMemberships((await membershipRes.json()).memberships ?? []);
      setManualPayments((await paymentRes.json()).payments ?? []);
      setUnavailablePtId((current) => current || ptPayload.pts?.[0]?.id || "");
      setMembershipForm((current) => ({
        ...current,
        customerId: current.customerId || customerPayload.customers?.[0]?.id || "",
      }));
      setPaymentForm((current) => ({
        ...current,
        customerId: current.customerId || customerPayload.customers?.[0]?.id || "",
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load manager data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (
    url: string,
    method: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Action failed");
      toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const guestAction = async (body: Record<string, unknown>, success: string) => {
    await submit("/api/guest-meetings", "PATCH", body, success);
  };

  const addUnavailableDay = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unavailableDate || !unavailablePtId) return;
    await submit(
      "/api/pt-unavailable-days",
      "POST",
      { ptId: unavailablePtId, unavailableDate },
      "Unavailable day saved",
    );
    setUnavailableDate("");
  };

  const removeUnavailableDay = async (id: string) => {
    await submit("/api/pt-unavailable-days", "DELETE", { id }, "Unavailable day removed");
  };

  const createPlan = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/packages",
      "POST",
      {
        ...planForm,
        priceVnd: Number(planForm.priceVnd),
        durationDays: Number(planForm.durationDays),
        bonusDays: 0,
        includesPtSessions: 0,
        active: 1,
        isPublic: 1,
        sortOrder: crmPlans.length + 1,
      },
      "Plan saved",
    );
    setPlanForm({ nameEn: "", nameVi: "", audience: "general", priceVnd: "200000", durationDays: "30" });
  };

  const createService = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/services",
      "POST",
      {
        ...serviceForm,
        priceVnd: Number(serviceForm.priceVnd),
        durationMinutes: Number(serviceForm.durationMinutes),
        active: 1,
        isPublic: 1,
        sortOrder: crmServices.length + 1,
      },
      "Service saved",
    );
    setServiceForm({ nameEn: "", nameVi: "", category: "training", priceVnd: "0", durationMinutes: "60" });
  };

  const createPromotion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/promotions",
      "POST",
      { ...promoForm, active: 1, isPublic: 1, sortOrder: crmPromotions.length + 1 },
      "Promotion saved",
    );
    setPromoForm({ titleEn: "", titleVi: "", bonusTermsEn: "", bonusTermsVi: "" });
  };

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/events",
      "POST",
      {
        ...eventForm,
        descriptionEn: "",
        descriptionVi: "",
        active: 1,
        isPublic: 1,
        sortOrder: crmEvents.length + 1,
      },
      "Event saved",
    );
    setEventForm({ titleEn: "", titleVi: "", eventType: "promotion" });
  };

  const createMembership = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!membershipForm.customerId) return;
    await submit(
      "/api/manager/memberships",
      "POST",
      {
        customerId: membershipForm.customerId,
        planId: membershipForm.planId || null,
        startsOn: membershipForm.startsOn,
        endsOn: membershipForm.endsOn,
        priceVndAtPurchase: Number(membershipForm.priceVndAtPurchase),
        status: "active",
      },
      "Membership saved",
    );
  };

  const createPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentForm.customerId) return;
    await submit(
      "/api/manager/payments",
      "POST",
      {
        customerId: paymentForm.customerId,
        membershipId: paymentForm.membershipId || null,
        purchaseRequestId: paymentForm.purchaseRequestId || null,
        amountVnd: Number(paymentForm.amountVnd),
        method: paymentForm.method,
        paidOn: paymentForm.paidOn,
      },
      "Payment recorded",
    );
  };

  const filteredCustomers = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return customers.slice(0, 12);
    return customers.filter(
      (customer) =>
        customer.displayName.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle),
    );
  }, [customers, filter]);

  if (!user || !["admin", "manager"].includes(user.role)) {
    return <AccessDenied title="Manager access required" />;
  }

  const activeTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  const pendingBookings = bookings.filter((booking) =>
    ["pending", "rescheduled", "confirmed"].includes(booking.status),
  );
  const activeGuestMeetings = guestMeetings.filter((meeting) =>
    ["confirmed", "completed", "email_failed"].includes(meeting.status),
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Manager CRM"
        subtitle="Support queue, booking operations, and customer lookup."
      />

      {loading && <div className="text-sm text-slate-400">Loading manager dashboard...</div>}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Metric
              label="Open tickets"
              value={activeTickets.length}
              icon={<Headphones className="size-5" />}
            />
            <Metric
              label="Active bookings"
              value={pendingBookings.length}
              icon={<CalendarCheck className="size-5" />}
            />
            <Metric
              label="Guest meetings"
              value={activeGuestMeetings.length}
              icon={<UserPlus className="size-5" />}
            />
            <Metric
              label="Customers"
              value={customers.length}
              icon={<Users className="size-5" />}
            />
          </div>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Package operations</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Customer requests, manual memberships, and offline payments.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                {purchaseRequests.length} requests / {manualPayments.length} payments
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl bg-white/[0.05] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">
                  Recent package requests
                </h3>
                <div className="space-y-2">
                  {purchaseRequests.length === 0 && (
                    <div className="text-sm text-slate-400">No package requests yet.</div>
                  )}
                  {purchaseRequests.slice(0, 8).map((request) => (
                    <div key={request.id} className="rounded-lg bg-black/15 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">
                            {request.customerName}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {request.planId || request.serviceOfferingId || "Custom request"} /{" "}
                            {request.status}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["contacted", "approved", "paid", "activated", "rejected"].map(
                            (status) => (
                              <Button
                                key={status}
                                size="sm"
                                variant={status === "rejected" ? "ghost" : "outline"}
                                disabled={busy || request.status === status}
                                onClick={() =>
                                  submit(
                                    "/api/manager/purchase-requests",
                                    "PATCH",
                                    { id: request.id, status },
                                    "Request updated",
                                  )
                                }
                              >
                                {status}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>
                      {(request.message || request.contactPhone) && (
                        <div className="mt-2 text-xs leading-5 text-slate-400">
                          {request.contactPhone && <span>{request.contactPhone} - </span>}
                          {request.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <form onSubmit={createMembership} className="rounded-xl bg-white/[0.05] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-100">
                    Add manual membership
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={membershipForm.customerId}
                      onChange={(e) =>
                        setMembershipForm((form) => ({ ...form, customerId: e.target.value }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.displayName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={membershipForm.planId}
                      onChange={(e) => {
                        const plan = crmPlans.find((item) => item.id === e.target.value);
                        setMembershipForm((form) => ({
                          ...form,
                          planId: e.target.value,
                          priceVndAtPurchase: plan
                            ? String(plan.priceVnd)
                            : form.priceVndAtPurchase,
                          endsOn: plan
                            ? addDaysString(plan.durationDays + plan.bonusDays, form.startsOn)
                            : form.endsOn,
                        }));
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">No plan</option>
                      {crmPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.nameEn}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={membershipForm.startsOn}
                      onChange={(e) =>
                        setMembershipForm((form) => ({ ...form, startsOn: e.target.value }))
                      }
                    />
                    <Input
                      type="date"
                      value={membershipForm.endsOn}
                      onChange={(e) =>
                        setMembershipForm((form) => ({ ...form, endsOn: e.target.value }))
                      }
                    />
                    <Input
                      type="number"
                      value={membershipForm.priceVndAtPurchase}
                      onChange={(e) =>
                        setMembershipForm((form) => ({
                          ...form,
                          priceVndAtPurchase: e.target.value,
                        }))
                      }
                    />
                    <Button disabled={busy || !membershipForm.customerId}>Save membership</Button>
                  </div>
                </form>

                <form onSubmit={createPayment} className="rounded-xl bg-white/[0.05] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-100">
                    Record manual payment
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={paymentForm.customerId}
                      onChange={(e) =>
                        setPaymentForm((form) => ({ ...form, customerId: e.target.value }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.displayName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={paymentForm.membershipId}
                      onChange={(e) =>
                        setPaymentForm((form) => ({ ...form, membershipId: e.target.value }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Membership</option>
                      {memberships.map((membership) => (
                        <option key={membership.id} value={membership.id}>
                          {membership.status} / {membership.endsOn}
                        </option>
                      ))}
                    </select>
                    <select
                      value={paymentForm.purchaseRequestId}
                      onChange={(e) =>
                        setPaymentForm((form) => ({
                          ...form,
                          purchaseRequestId: e.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Package request</option>
                      {purchaseRequests.map((request) => (
                        <option key={request.id} value={request.id}>
                          {request.customerName} / {request.status}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={paymentForm.amountVnd}
                      onChange={(e) =>
                        setPaymentForm((form) => ({ ...form, amountVnd: e.target.value }))
                      }
                    />
                    <Input
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm((form) => ({ ...form, method: e.target.value }))
                      }
                    />
                    <Input
                      type="date"
                      value={paymentForm.paidOn}
                      onChange={(e) =>
                        setPaymentForm((form) => ({ ...form, paidOn: e.target.value }))
                      }
                    />
                    <Button disabled={busy || !paymentForm.customerId}>Record payment</Button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Public CRM catalog</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Plans, PT services, promotions, and events shown on the guest landing page.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                {crmPlans.length} plans / {crmServices.length} services
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={createPlan} className="rounded-xl bg-white/[0.05] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Add membership plan</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Name EN"
                    value={planForm.nameEn}
                    onChange={(e) => setPlanForm((form) => ({ ...form, nameEn: e.target.value }))}
                  />
                  <Input
                    placeholder="Name VI"
                    value={planForm.nameVi}
                    onChange={(e) => setPlanForm((form) => ({ ...form, nameVi: e.target.value }))}
                  />
                  <Input
                    placeholder="Audience"
                    value={planForm.audience}
                    onChange={(e) =>
                      setPlanForm((form) => ({ ...form, audience: e.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Price VND"
                    value={planForm.priceVnd}
                    onChange={(e) =>
                      setPlanForm((form) => ({ ...form, priceVnd: e.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Duration days"
                    value={planForm.durationDays}
                    onChange={(e) =>
                      setPlanForm((form) => ({ ...form, durationDays: e.target.value }))
                    }
                  />
                  <Button disabled={busy || !planForm.nameEn || !planForm.nameVi}>Save plan</Button>
                </div>
                <CrmRows
                  rows={crmPlans.slice(0, 4).map((item) => ({
                    id: item.id,
                    title: item.nameEn,
                    detail: `${item.priceVnd.toLocaleString("en-US")} VND`,
                    active: item.active,
                  }))}
                  onDeactivate={(id) =>
                    submit("/api/manager/packages", "DELETE", { id }, "Plan deactivated")
                  }
                  busy={busy}
                />
              </form>

              <form onSubmit={createService} className="rounded-xl bg-white/[0.05] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Add PT service</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Name EN"
                    value={serviceForm.nameEn}
                    onChange={(e) =>
                      setServiceForm((form) => ({ ...form, nameEn: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Name VI"
                    value={serviceForm.nameVi}
                    onChange={(e) =>
                      setServiceForm((form) => ({ ...form, nameVi: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Category"
                    value={serviceForm.category}
                    onChange={(e) =>
                      setServiceForm((form) => ({ ...form, category: e.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Price VND"
                    value={serviceForm.priceVnd}
                    onChange={(e) =>
                      setServiceForm((form) => ({ ...form, priceVnd: e.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Minutes"
                    value={serviceForm.durationMinutes}
                    onChange={(e) =>
                      setServiceForm((form) => ({ ...form, durationMinutes: e.target.value }))
                    }
                  />
                  <Button disabled={busy || !serviceForm.nameEn || !serviceForm.nameVi}>
                    Save service
                  </Button>
                </div>
                <CrmRows
                  rows={crmServices.slice(0, 4).map((item) => ({
                    id: item.id,
                    title: item.nameEn,
                    detail: `${item.priceVnd.toLocaleString("en-US")} VND`,
                    active: item.active,
                  }))}
                  onDeactivate={(id) =>
                    submit("/api/manager/services", "DELETE", { id }, "Service deactivated")
                  }
                  busy={busy}
                />
              </form>

              <form onSubmit={createPromotion} className="rounded-xl bg-white/[0.05] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Add promotion</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Title EN"
                    value={promoForm.titleEn}
                    onChange={(e) =>
                      setPromoForm((form) => ({ ...form, titleEn: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Title VI"
                    value={promoForm.titleVi}
                    onChange={(e) =>
                      setPromoForm((form) => ({ ...form, titleVi: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Terms EN"
                    value={promoForm.bonusTermsEn}
                    onChange={(e) =>
                      setPromoForm((form) => ({ ...form, bonusTermsEn: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Terms VI"
                    value={promoForm.bonusTermsVi}
                    onChange={(e) =>
                      setPromoForm((form) => ({ ...form, bonusTermsVi: e.target.value }))
                    }
                  />
                  <Button disabled={busy || !promoForm.titleEn || !promoForm.titleVi}>
                    Save promo
                  </Button>
                </div>
                <CrmRows
                  rows={crmPromotions.slice(0, 4).map((item) => ({
                    id: item.id,
                    title: item.titleEn,
                    detail: item.bonusTermsEn,
                    active: item.active,
                  }))}
                  onDeactivate={(id) =>
                    submit("/api/manager/promotions", "DELETE", { id }, "Promotion deactivated")
                  }
                  busy={busy}
                />
              </form>

              <form onSubmit={createEvent} className="rounded-xl bg-white/[0.05] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Add public event</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Title EN"
                    value={eventForm.titleEn}
                    onChange={(e) =>
                      setEventForm((form) => ({ ...form, titleEn: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Title VI"
                    value={eventForm.titleVi}
                    onChange={(e) =>
                      setEventForm((form) => ({ ...form, titleVi: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Type"
                    value={eventForm.eventType}
                    onChange={(e) =>
                      setEventForm((form) => ({ ...form, eventType: e.target.value }))
                    }
                  />
                  <Button disabled={busy || !eventForm.titleEn || !eventForm.titleVi}>
                    Save event
                  </Button>
                </div>
                <CrmRows
                  rows={crmEvents.slice(0, 4).map((item) => ({
                    id: item.id,
                    title: item.titleEn,
                    detail: item.eventType,
                    active: item.active,
                  }))}
                  onDeactivate={(id) =>
                    submit("/api/manager/events", "DELETE", { id }, "Event deactivated")
                  }
                  busy={busy}
                />
              </form>
            </div>
          </section>

          <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Guest meetings</h2>
              <div className="space-y-3">
                {activeGuestMeetings.length === 0 && (
                  <div className="text-sm text-slate-400">No active guest meetings.</div>
                )}
                {activeGuestMeetings.slice(0, 12).map((meeting) => (
                  <div key={meeting.id} className="rounded-xl bg-white/[0.05] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{meeting.guestName}</div>
                        <div className="text-xs text-slate-400">
                          {meeting.status.toUpperCase()} - {formatDate(meeting.scheduledAt)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {meeting.guestEmail} - {meeting.guestPhone}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meeting.status !== "completed" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              guestAction(
                                { id: meeting.id, action: "complete" },
                                "Guest meeting completed",
                              )
                            }
                          >
                            Complete
                          </Button>
                        )}
                        {(meeting.status === "completed" ||
                          (meeting.status === "email_failed" && meeting.createdUserId)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              guestAction(
                                { id: meeting.id, action: "send-login" },
                                "Login email sent",
                              )
                            }
                          >
                            Send login
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={meeting.assignedPtId ?? ""}
                        onChange={(e) =>
                          guestAction(
                            { id: meeting.id, action: "reassign", ptId: e.target.value },
                            "Guest meeting reassigned",
                          )
                        }
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        disabled={busy}
                      >
                        {pts.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.displayName}
                          </option>
                        ))}
                      </select>
                      {meeting.usedFallback === 1 && (
                        <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs text-primary">
                          Fallback
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">PT unavailable days</h2>
              <form onSubmit={addUnavailableDay} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  value={unavailablePtId}
                  onChange={(e) => setUnavailablePtId(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {pts.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.displayName}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={unavailableDate}
                  onChange={(e) => setUnavailableDate(e.target.value)}
                  className="h-10"
                />
                <Button type="submit" disabled={busy || !unavailableDate || !unavailablePtId}>
                  <CalendarOff className="mr-2 size-4" strokeWidth={1.8} />
                  Add
                </Button>
              </form>
              <div className="mt-4 space-y-2">
                {unavailableDays.length === 0 && (
                  <div className="text-sm text-slate-400">No unavailable days set.</div>
                )}
                {unavailableDays.slice(0, 10).map((day) => {
                  const pt = pts.find((item) => item.id === day.ptId);
                  return (
                    <div
                      key={day.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{day.unavailableDate}</div>
                        <div className="text-xs text-slate-500">{pt?.displayName ?? day.ptId}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => removeUnavailableDay(day.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Support queue</h2>
              <div className="space-y-3">
                {activeTickets.length === 0 && (
                  <div className="text-sm text-slate-400">No open support tickets.</div>
                )}
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl bg-white/[0.05] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{ticket.subject}</div>
                        <div className="text-xs text-slate-400">
                          {ticket.customerName} - {ticket.source} - {ticket.status}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy || ticket.assignedManagerId === user.id}
                          onClick={() =>
                            submit(
                              "/api/support",
                              "PATCH",
                              { id: ticket.id, assignedManagerId: user.id, status: "assigned" },
                              "Ticket assigned",
                            )
                          }
                        >
                          Assign me
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/support",
                              "PATCH",
                              {
                                id: ticket.id,
                                status: "resolved",
                                resolutionNotes: "Resolved by manager.",
                              },
                              "Ticket resolved",
                            )
                          }
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                    {pts.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={ticket.assignedPtId ?? ""}
                          onChange={(e) =>
                            submit(
                              "/api/support",
                              "PATCH",
                              {
                                id: ticket.id,
                                assignedPtId: e.target.value || null,
                                status: e.target.value ? "assigned" : "open",
                              },
                              e.target.value ? "Ticket assigned to PT" : "PT assignment cleared",
                            )
                          }
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={busy}
                        >
                          <option value="">No PT assigned</option>
                          {pts.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-slate-300">{ticket.message}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Booking operations</h2>
              <div className="space-y-3">
                {pendingBookings.length === 0 && (
                  <div className="text-sm text-slate-400">No active bookings.</div>
                )}
                {pendingBookings.slice(0, 10).map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-white/[0.05] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">
                          {booking.status.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(booking.scheduledAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/bookings",
                              "PATCH",
                              { id: booking.id, action: "accept" },
                              "Booking confirmed",
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/bookings",
                              "PATCH",
                              { id: booking.id, action: "complete" },
                              "Booking completed",
                            )
                          }
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                    {booking.notes && (
                      <p className="mt-2 text-xs italic text-slate-300">{booking.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100">Customer lookup</h2>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search customer"
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="rounded-xl bg-white/[0.05] p-4">
                  <div className="text-sm font-medium text-slate-100">{customer.displayName}</div>
                  <div className="text-xs text-slate-400">{customer.email}</div>
                  <div className="mt-2 text-xs text-slate-300">
                    {customer.assignedPtId ? "Assigned PT set" : "No PT assigned"} -{" "}
                    {customer.canViewFitness ? "Fitness data allowed" : "Operational view only"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CrmRows({
  rows,
  onDeactivate,
  busy,
}: {
  rows: { id: string; title: string; detail: string; active: number }[];
  onDeactivate: (id: string) => void;
  busy: boolean;
}) {
  if (rows.length === 0) {
    return <div className="mt-3 text-sm text-slate-400">No records yet.</div>;
  }
  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/15 p-2">
          <div className="min-w-0">
            <div className="truncate text-sm text-slate-100">{row.title}</div>
            <div className="truncate text-xs text-slate-500">
              {row.active === 1 ? "Public" : "Inactive"} / {row.detail}
            </div>
          </div>
          {row.active === 1 && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDeactivate(row.id)}>
              Hide
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysString(days: number, from = todayString()) {
  const date = new Date(`${from}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
