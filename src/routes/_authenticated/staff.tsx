import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarCheck, Headphones, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PtAvailabilityCalendar,
  type PtAvailabilityBlock,
} from "@/components/PtAvailabilityCalendar";
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
  meetingType?: string | null;
  onlineMeetingUrl?: string | null;
  zaloUserId?: string | null;
  createdUserId?: string | null;
};

type CrmPlan = {
  id: string;
  nameEn: string;
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
  category: string;
  priceVnd: number;
  durationMinutes: number;
  active: number;
  isPublic: number;
};

type CrmPromotion = {
  id: string;
  titleEn: string;
  bonusTermsEn: string;
  active: number;
  isPublic: number;
};

type CrmEvent = {
  id: string;
  titleEn: string;
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
  const [guestLinkDrafts, setGuestLinkDrafts] = useState<Record<string, string>>({});
  const [availabilityBlocks, setAvailabilityBlocks] = useState<PtAvailabilityBlock[]>([]);
  const [crmPlans, setCrmPlans] = useState<CrmPlan[]>([]);
  const [crmServices, setCrmServices] = useState<CrmService[]>([]);
  const [crmPromotions, setCrmPromotions] = useState<CrmPromotion[]>([]);
  const [crmEvents, setCrmEvents] = useState<CrmEvent[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [manualPayments, setManualPayments] = useState<ManualPayment[]>([]);
  const [filter, setFilter] = useState("");
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
    audience: "general",
    priceVnd: "200000",
    durationDays: "30",
  });
  const [serviceForm, setServiceForm] = useState({
    nameEn: "",
    category: "training",
    priceVnd: "0",
    durationMinutes: "60",
  });
  const [promoForm, setPromoForm] = useState({
    titleEn: "",
    bonusTermsEn: "",
  });
  const [eventForm, setEventForm] = useState({
    titleEn: "",
    eventType: "promotion",
  });
  const [tab, setTab] = useState<
    "triage" | "sales" | "meetings" | "support" | "bookings" | "catalog" | "customers" | "pt"
  >("triage");
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
      ] = await Promise.all([
        fetch("/api/support", { credentials: "include" }),
        fetch("/api/bookings", { credentials: "include" }),
        fetch("/api/customers", { credentials: "include" }),
        fetch("/api/pts", { credentials: "include" }),
        fetch("/api/guest-meetings", { credentials: "include" }),
        fetch("/api/pt-unavailability-blocks", { credentials: "include" }),
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
      setAvailabilityBlocks((await unavailableRes.json()).blocks ?? []);
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
    setPlanForm({
      nameEn: "",
      audience: "general",
      priceVnd: "200000",
      durationDays: "30",
    });
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
    setServiceForm({
      nameEn: "",
      category: "training",
      priceVnd: "0",
      durationMinutes: "60",
    });
  };

  const createPromotion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/promotions",
      "POST",
      { ...promoForm, active: 1, isPublic: 1, sortOrder: crmPromotions.length + 1 },
      "Promotion saved",
    );
    setPromoForm({ titleEn: "", bonusTermsEn: "" });
  };

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(
      "/api/manager/events",
      "POST",
      {
        ...eventForm,
        descriptionEn: "",
        active: 1,
        isPublic: 1,
        sortOrder: crmEvents.length + 1,
      },
      "Event saved",
    );
    setEventForm({ titleEn: "", eventType: "promotion" });
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

  const quickItems: { id: typeof tab; label: string; hint: string }[] = [
    { id: "triage", label: "Today’s work", hint: "Start here: see what needs attention." },
    { id: "sales", label: "Sales ops", hint: "Requests, memberships, manual payments." },
    { id: "meetings", label: "Guest meetings", hint: "Assign PT, set link, send reminder/login." },
    { id: "support", label: "Support", hint: "Assign tickets and resolve issues." },
    { id: "bookings", label: "Bookings", hint: "Confirm or complete sessions." },
    { id: "catalog", label: "Public catalog", hint: "Plans, services, promos, events." },
    { id: "customers", label: "Customers", hint: "Lookup basic customer status." },
    { id: "pt", label: "PT calendar", hint: "Block PT unavailable time." },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Manager CRM"
        subtitle="Daily operations: triage, support, bookings, guest onboarding, and catalog updates."
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-100">Quick start</h2>
                <p className="mt-1 text-sm text-slate-400">
                  New here? Use these shortcuts. They map to the main jobs on this page.
                </p>
              </div>
              <Button variant="outline" disabled={busy} onClick={load}>
                Refresh data
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {quickItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    tab === item.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.hint}</div>
                </button>
              ))}
            </div>
          </section>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1110] p-2">
              <TabsList className="h-auto w-max gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="triage"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Today
                </TabsTrigger>
                <TabsTrigger
                  value="sales"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Sales ops
                </TabsTrigger>
                <TabsTrigger
                  value="meetings"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Guest meetings
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Support
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Bookings
                </TabsTrigger>
                <TabsTrigger
                  value="catalog"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Catalog
                </TabsTrigger>
                <TabsTrigger
                  value="customers"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Customers
                </TabsTrigger>
                <TabsTrigger
                  value="pt"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  PT calendar
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="triage" className="mt-0">
              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">Needs attention</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Start here each day: new package requests, tickets, and bookings.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-white/[0.05] p-4">
                      <div className="text-xs text-slate-400">Package requests</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-100">
                        {purchaseRequests.length}
                      </div>
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setTab("sales")}
                      >
                        Review requests
                      </Button>
                    </div>
                    <div className="rounded-xl bg-white/[0.05] p-4">
                      <div className="text-xs text-slate-400">Open tickets</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-100">
                        {activeTickets.length}
                      </div>
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setTab("support")}
                      >
                        Go to support queue
                      </Button>
                    </div>
                    <div className="rounded-xl bg-white/[0.05] p-4">
                      <div className="text-xs text-slate-400">Active bookings</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-100">
                        {pendingBookings.length}
                      </div>
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setTab("bookings")}
                      >
                        Go to bookings
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                  <h2 className="text-lg font-semibold text-slate-100">Guest onboarding</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Assign a PT, then send reminder/login after the meeting.
                  </p>
                  <div className="mt-4 rounded-xl bg-white/[0.05] p-4">
                    <div className="text-xs text-slate-400">Active guest meetings</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-100">
                      {activeGuestMeetings.length}
                    </div>
                    <Button
                      className="mt-3 w-full"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setTab("meetings")}
                    >
                      Manage guest meetings
                    </Button>
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="mt-0">
              <section className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Sales operations</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Update package requests, then add membership and record payment if needed.
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
                      {purchaseRequests.slice(0, 10).map((request) => (
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
                      <h3 className="mb-1 text-sm font-semibold text-slate-100">
                        Add manual membership
                      </h3>
                      <p className="mb-3 text-xs text-slate-400">
                        Use this when a customer paid offline or needs manual activation.
                      </p>
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
                        <Button disabled={busy || !membershipForm.customerId}>
                          Save membership
                        </Button>
                      </div>
                    </form>

                    <form onSubmit={createPayment} className="rounded-xl bg-white/[0.05] p-4">
                      <h3 className="mb-1 text-sm font-semibold text-slate-100">
                        Record manual payment
                      </h3>
                      <p className="mb-3 text-xs text-slate-400">
                        Use this when payment is received outside the app.
                      </p>
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
            </TabsContent>

            <TabsContent value="catalog" className="mt-0">
              <section className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Public CRM catalog</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      These items show on the guest landing page. Hide instead of deleting.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {crmPlans.length} plans / {crmServices.length} services
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <form onSubmit={createPlan} className="rounded-xl bg-white/[0.05] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">
                      Add membership plan
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Name"
                        value={planForm.nameEn}
                        onChange={(e) =>
                          setPlanForm((form) => ({ ...form, nameEn: e.target.value }))
                        }
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
                      <Button disabled={busy || !planForm.nameEn}>Save plan</Button>
                    </div>
                    <CrmRows
                      rows={crmPlans.slice(0, 6).map((item) => ({
                        id: item.id,
                        title: item.nameEn,
                        detail: `${item.priceVnd.toLocaleString("en-US")} VND`,
                        active: item.active,
                      }))}
                      onDeactivate={(id) =>
                        submit("/api/manager/packages", "DELETE", { id }, "Plan hidden")
                      }
                      busy={busy}
                    />
                  </form>

                  <form onSubmit={createService} className="rounded-xl bg-white/[0.05] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Add PT service</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Name"
                        value={serviceForm.nameEn}
                        onChange={(e) =>
                          setServiceForm((form) => ({ ...form, nameEn: e.target.value }))
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
                      <Button disabled={busy || !serviceForm.nameEn}>Save service</Button>
                    </div>
                    <CrmRows
                      rows={crmServices.slice(0, 6).map((item) => ({
                        id: item.id,
                        title: item.nameEn,
                        detail: `${item.priceVnd.toLocaleString("en-US")} VND`,
                        active: item.active,
                      }))}
                      onDeactivate={(id) =>
                        submit("/api/manager/services", "DELETE", { id }, "Service hidden")
                      }
                      busy={busy}
                    />
                  </form>

                  <form onSubmit={createPromotion} className="rounded-xl bg-white/[0.05] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Add promotion</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Title"
                        value={promoForm.titleEn}
                        onChange={(e) =>
                          setPromoForm((form) => ({ ...form, titleEn: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Terms"
                        value={promoForm.bonusTermsEn}
                        onChange={(e) =>
                          setPromoForm((form) => ({ ...form, bonusTermsEn: e.target.value }))
                        }
                      />
                      <Button disabled={busy || !promoForm.titleEn}>Save promo</Button>
                    </div>
                    <CrmRows
                      rows={crmPromotions.slice(0, 6).map((item) => ({
                        id: item.id,
                        title: item.titleEn,
                        detail: item.bonusTermsEn,
                        active: item.active,
                      }))}
                      onDeactivate={(id) =>
                        submit("/api/manager/promotions", "DELETE", { id }, "Promotion hidden")
                      }
                      busy={busy}
                    />
                  </form>

                  <form onSubmit={createEvent} className="rounded-xl bg-white/[0.05] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-100">Add public event</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Title"
                        value={eventForm.titleEn}
                        onChange={(e) =>
                          setEventForm((form) => ({ ...form, titleEn: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Type"
                        value={eventForm.eventType}
                        onChange={(e) =>
                          setEventForm((form) => ({ ...form, eventType: e.target.value }))
                        }
                      />
                      <Button disabled={busy || !eventForm.titleEn}>Save event</Button>
                    </div>
                    <CrmRows
                      rows={crmEvents.slice(0, 6).map((item) => ({
                        id: item.id,
                        title: item.titleEn,
                        detail: item.eventType,
                        active: item.active,
                      }))}
                      onDeactivate={(id) =>
                        submit("/api/manager/events", "DELETE", { id }, "Event hidden")
                      }
                      busy={busy}
                    />
                  </form>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="meetings" className="mt-0">
              <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-slate-100">Guest meetings</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      For each guest: confirm assigned PT, set an online link (if needed), then send
                      reminder/login.
                    </p>
                  </div>
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
                          <span
                            className={`rounded-lg px-2 py-1 text-xs ${
                              meeting.meetingType === "online"
                                ? "bg-primary/15 text-primary"
                                : "bg-white/[0.06] text-slate-300"
                            }`}
                          >
                            {meeting.meetingType === "online" ? "Online" : "In person"}
                          </span>
                          {meeting.usedFallback === 1 && (
                            <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs text-primary">
                              Fallback
                            </span>
                          )}
                        </div>
                        {meeting.meetingType === "online" && (
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={
                                  guestLinkDrafts[meeting.id] ?? meeting.onlineMeetingUrl ?? ""
                                }
                                onChange={(e) =>
                                  setGuestLinkDrafts((prev) => ({
                                    ...prev,
                                    [meeting.id]: e.target.value,
                                  }))
                                }
                                placeholder="https://meet.jit.si/..."
                                className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  busy || !(guestLinkDrafts[meeting.id] ?? meeting.onlineMeetingUrl)
                                }
                                onClick={() =>
                                  guestAction(
                                    {
                                      id: meeting.id,
                                      action: "set-link",
                                      onlineMeetingUrl:
                                        guestLinkDrafts[meeting.id] ?? meeting.onlineMeetingUrl,
                                    },
                                    "Meeting link saved",
                                  )
                                }
                              >
                                Save link
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  guestAction(
                                    { id: meeting.id, action: "send-zalo" },
                                    "Zalo message sent",
                                  )
                                }
                              >
                                Send via Zalo
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  guestAction({ id: meeting.id, action: "remind" }, "Reminder sent")
                                }
                              >
                                Send reminder
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <PtAvailabilityCalendar
                  title="PT unavailable time"
                  blocks={availabilityBlocks}
                  pts={pts}
                  selectedPtId={unavailablePtId}
                  onSelectedPtIdChange={setUnavailablePtId}
                  onRefresh={load}
                />
              </div>
            </TabsContent>

            <TabsContent value="pt" className="mt-0">
              <PtAvailabilityCalendar
                title="PT unavailable time"
                blocks={availabilityBlocks}
                pts={pts}
                selectedPtId={unavailablePtId}
                onSelectedPtIdChange={setUnavailablePtId}
                onRefresh={load}
              />
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-slate-100">Support queue</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Assign tickets to yourself or a PT, then resolve when done.
                  </p>
                </div>
                <div className="space-y-3">
                  {activeTickets.length === 0 && (
                    <div className="text-sm text-slate-400">No open support tickets.</div>
                  )}
                  {activeTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl bg-white/[0.05] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-100">{ticket.subject}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {ticket.customerName} • {ticket.source} • {ticket.status}
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
            </TabsContent>

            <TabsContent value="bookings" className="mt-0">
              <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-slate-100">Booking operations</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Confirm upcoming sessions and mark completed sessions when finished.
                  </p>
                </div>
                <div className="space-y-3">
                  {pendingBookings.length === 0 && (
                    <div className="text-sm text-slate-400">No active bookings.</div>
                  )}
                  {pendingBookings.slice(0, 12).map((booking) => (
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
            </TabsContent>

            <TabsContent value="customers" className="mt-0">
              <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Customer lookup</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Quick operational view (membership/future details live in other tools).
                    </p>
                  </div>
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search customer by name or email"
                    className="max-w-xs"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-xl bg-white/[0.05] p-4">
                      <div className="text-sm font-medium text-slate-100">
                        {customer.displayName}
                      </div>
                      <div className="text-xs text-slate-400">{customer.email}</div>
                      <div className="mt-2 text-xs text-slate-300">
                        {customer.assignedPtId ? "Assigned PT set" : "No PT assigned"} •{" "}
                        {customer.canViewFitness ? "Fitness data allowed" : "Operational view only"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>
          </Tabs>
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
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg bg-black/15 p-2"
        >
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
