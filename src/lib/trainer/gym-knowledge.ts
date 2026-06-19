import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import {
  formatVnd,
  getMembershipRuntimeStatus,
  type MembershipStatus,
} from "@/lib/crm";
import { db, schema } from "@/server/db";

const MAX_GYM_KNOWLEDGE_CHARS = 5200;

export type GymKnowledgeTopic =
  | "all"
  | "plans"
  | "offers"
  | "classes"
  | "pts"
  | "events"
  | "membership";

type BuildGymKnowledgeInput = {
  userId: string;
  now?: Date;
  topic?: GymKnowledgeTopic;
  classLimit?: number;
};

export type GymKnowledge = {
  topic: GymKnowledgeTopic;
  text: string;
};

export async function buildGymKnowledge({
  userId,
  now = new Date(),
  topic = "all",
  classLimit = 8,
}: BuildGymKnowledgeInput): Promise<GymKnowledge> {
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  const [
    branches,
    plans,
    services,
    promotions,
    events,
    pts,
    ptServices,
    classSessions,
    classBookingCounts,
    userRows,
    memberships,
    purchaseRequests,
    ptBookings,
    myClassBookings,
  ] = await Promise.all([
    db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.active, 1))
      .orderBy(asc(schema.branches.createdAt))
      .limit(3),
    db
      .select()
      .from(schema.membershipPlans)
      .where(and(eq(schema.membershipPlans.active, 1), eq(schema.membershipPlans.isPublic, 1)))
      .orderBy(asc(schema.membershipPlans.sortOrder), asc(schema.membershipPlans.priceVnd))
      .limit(12),
    db
      .select()
      .from(schema.serviceOfferings)
      .where(and(eq(schema.serviceOfferings.active, 1), eq(schema.serviceOfferings.isPublic, 1)))
      .orderBy(asc(schema.serviceOfferings.sortOrder), asc(schema.serviceOfferings.priceVnd))
      .limit(12),
    db
      .select()
      .from(schema.promotions)
      .where(and(eq(schema.promotions.active, 1), eq(schema.promotions.isPublic, 1)))
      .orderBy(asc(schema.promotions.sortOrder), desc(schema.promotions.createdAt))
      .limit(8),
    db
      .select()
      .from(schema.publicEvents)
      .where(and(eq(schema.publicEvents.active, 1), eq(schema.publicEvents.isPublic, 1)))
      .orderBy(asc(schema.publicEvents.sortOrder), desc(schema.publicEvents.createdAt))
      .limit(8),
    db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        email: schema.users.email,
        bioEn: schema.ptProfiles.bioEn,
        bioVi: schema.ptProfiles.bioVi,
        specialtiesEn: schema.ptProfiles.specialtiesEn,
        specialtiesVi: schema.ptProfiles.specialtiesVi,
        yearsExperience: schema.ptProfiles.yearsExperience,
      })
      .from(schema.users)
      .innerJoin(schema.ptProfiles, eq(schema.users.id, schema.ptProfiles.userId))
      .where(and(eq(schema.users.role, "pt"), eq(schema.ptProfiles.isPublic, 1)))
      .orderBy(asc(schema.users.displayName))
      .limit(12),
    db
      .select({
        ptId: schema.ptServiceOfferings.ptId,
        serviceOfferingId: schema.ptServiceOfferings.serviceOfferingId,
        nameEn: schema.serviceOfferings.nameEn,
        nameVi: schema.serviceOfferings.nameVi,
        priceVnd: schema.serviceOfferings.priceVnd,
        category: schema.serviceOfferings.category,
      })
      .from(schema.ptServiceOfferings)
      .innerJoin(
        schema.serviceOfferings,
        eq(schema.ptServiceOfferings.serviceOfferingId, schema.serviceOfferings.id),
      )
      .where(
        and(
          eq(schema.ptServiceOfferings.active, 1),
          eq(schema.serviceOfferings.active, 1),
          eq(schema.serviceOfferings.isPublic, 1),
        ),
      ),
    db
      .select({
        sessionId: schema.groupClassSessions.id,
        classId: schema.groupClassSessions.classId,
        title: schema.groupClasses.title,
        description: schema.groupClasses.description,
        level: schema.groupClasses.level,
        trainerId: schema.groupClassSessions.trainerId,
        trainerName: schema.users.displayName,
        startsAt: schema.groupClassSessions.startsAt,
        durationMinutes: schema.groupClassSessions.durationMinutes,
        capacity: schema.groupClassSessions.capacity,
        status: schema.groupClassSessions.status,
      })
      .from(schema.groupClassSessions)
      .innerJoin(schema.groupClasses, eq(schema.groupClassSessions.classId, schema.groupClasses.id))
      .leftJoin(schema.users, eq(schema.groupClassSessions.trainerId, schema.users.id))
      .where(
        and(
          eq(schema.groupClasses.active, 1),
          eq(schema.groupClassSessions.status, "scheduled"),
          gte(schema.groupClassSessions.startsAt, nowIso),
        ),
      )
      .orderBy(asc(schema.groupClassSessions.startsAt))
      .limit(40),
    db
      .select({
        sessionId: schema.groupClassBookings.sessionId,
        count: sql<number>`count(*)`,
      })
      .from(schema.groupClassBookings)
      .where(eq(schema.groupClassBookings.status, "booked"))
      .groupBy(schema.groupClassBookings.sessionId),
    db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
    db
      .select({
        id: schema.memberships.id,
        planId: schema.memberships.planId,
        planName: schema.membershipPlans.nameEn,
        status: schema.memberships.status,
        startsOn: schema.memberships.startsOn,
        endsOn: schema.memberships.endsOn,
        priceVndAtPurchase: schema.memberships.priceVndAtPurchase,
        assignedPtId: schema.memberships.assignedPtId,
        notes: schema.memberships.notes,
      })
      .from(schema.memberships)
      .leftJoin(schema.membershipPlans, eq(schema.memberships.planId, schema.membershipPlans.id))
      .where(eq(schema.memberships.customerId, userId))
      .orderBy(desc(schema.memberships.endsOn))
      .limit(5),
    db
      .select({
        id: schema.purchaseRequests.id,
        planId: schema.purchaseRequests.planId,
        planName: schema.membershipPlans.nameEn,
        serviceOfferingId: schema.purchaseRequests.serviceOfferingId,
        serviceName: schema.serviceOfferings.nameEn,
        preferredPtId: schema.purchaseRequests.preferredPtId,
        status: schema.purchaseRequests.status,
        message: schema.purchaseRequests.message,
        requestedStartDate: schema.purchaseRequests.requestedStartDate,
        createdAt: schema.purchaseRequests.createdAt,
      })
      .from(schema.purchaseRequests)
      .leftJoin(schema.membershipPlans, eq(schema.purchaseRequests.planId, schema.membershipPlans.id))
      .leftJoin(
        schema.serviceOfferings,
        eq(schema.purchaseRequests.serviceOfferingId, schema.serviceOfferings.id),
      )
      .where(eq(schema.purchaseRequests.customerId, userId))
      .orderBy(desc(schema.purchaseRequests.createdAt))
      .limit(5),
    db
      .select({
        id: schema.bookings.id,
        ptId: schema.bookings.ptId,
        ptName: schema.users.displayName,
        status: schema.bookings.status,
        scheduledAt: schema.bookings.scheduledAt,
        durationMinutes: schema.bookings.durationMinutes,
        notes: schema.bookings.notes,
      })
      .from(schema.bookings)
      .leftJoin(schema.users, eq(schema.bookings.ptId, schema.users.id))
      .where(and(eq(schema.bookings.customerId, userId), gte(schema.bookings.scheduledAt, nowIso)))
      .orderBy(asc(schema.bookings.scheduledAt))
      .limit(8),
    db
      .select({
        bookingId: schema.groupClassBookings.id,
        status: schema.groupClassBookings.status,
        sessionId: schema.groupClassBookings.sessionId,
        title: schema.groupClasses.title,
        startsAt: schema.groupClassSessions.startsAt,
      })
      .from(schema.groupClassBookings)
      .innerJoin(
        schema.groupClassSessions,
        eq(schema.groupClassBookings.sessionId, schema.groupClassSessions.id),
      )
      .innerJoin(schema.groupClasses, eq(schema.groupClassSessions.classId, schema.groupClasses.id))
      .where(eq(schema.groupClassBookings.customerId, userId))
      .orderBy(desc(schema.groupClassSessions.startsAt))
      .limit(8),
  ]);

  const servicesByPt = new Map<string, typeof ptServices>();
  for (const row of ptServices) {
    const rows = servicesByPt.get(row.ptId) ?? [];
    rows.push(row);
    servicesByPt.set(row.ptId, rows);
  }
  const countBySession = new Map(
    classBookingCounts.map((row) => [row.sessionId, Number(row.count ?? 0)]),
  );
  const availableClasses = classSessions
    .map((row) => {
      const bookedCount = countBySession.get(row.sessionId) ?? 0;
      return {
        ...row,
        bookedCount,
        seatsLeft: Math.max(0, row.capacity - bookedCount),
      };
    })
    .filter((row) => row.seatsLeft > 0)
    .slice(0, classLimit);

  const member = userRows[0] ?? null;
  const assignedPt = member?.assignedPtId
    ? pts.find((pt) => pt.id === member.assignedPtId)?.displayName || member.assignedPtId
    : "not assigned";

  const sections = [
    `HL Fitness gym knowledge (DB-backed, today ${today}):`,
    includeTopic(topic, ["all"]) ? formatBranches(branches) : "",
    includeTopic(topic, ["all", "plans"]) ? formatPlans(plans) : "",
    includeTopic(topic, ["all", "plans", "pts"]) ? formatServices(services) : "",
    includeTopic(topic, ["all", "offers"]) ? formatPromotions(promotions) : "",
    includeTopic(topic, ["all", "events"]) ? formatEvents(events) : "",
    includeTopic(topic, ["all", "pts"]) ? formatPts(pts, servicesByPt) : "",
    includeTopic(topic, ["all", "classes"]) ? formatAvailableClasses(availableClasses) : "",
    includeTopic(topic, ["all", "membership"])
      ? formatMemberState({
          memberships,
          purchaseRequests,
          ptBookings,
          myClassBookings,
          today,
          assignedPt,
        })
      : "",
  ].filter(Boolean);

  return {
    topic,
    text: limitText(sections.join("\n\n"), MAX_GYM_KNOWLEDGE_CHARS),
  };
}

function includeTopic(topic: GymKnowledgeTopic, allowed: GymKnowledgeTopic[]) {
  return allowed.includes(topic);
}

function formatBranches(branches: Array<typeof schema.branches.$inferSelect>) {
  if (branches.length === 0) return "Branch details:\n- No active branch details saved.";
  return [
    "Branch details:",
    ...branches.map(
      (branch) =>
        `- ${branch.nameEn}: ${branch.addressEn}; phone ${branch.phone}; hours ${branch.hoursEn}; map ${branch.mapUrl || "not saved"}; Facebook ${branch.facebookUrl || "not saved"}`,
    ),
  ].join("\n");
}

function formatPlans(plans: Array<typeof schema.membershipPlans.$inferSelect>) {
  if (plans.length === 0) return "Public membership plans:\n- No public plans saved.";
  return [
    "Public membership plans:",
    ...plans.map(
      (plan) =>
        `- ${plan.nameEn} (${plan.nameVi}): ${formatVnd(plan.priceVnd)} / ${plan.durationDays} days; audience ${plan.audience}; bonus ${plan.bonusDays} days; includes ${plan.includesPtSessions} PT sessions; ${plan.descriptionEn || "no description"}`,
    ),
  ].join("\n");
}

function formatServices(services: Array<typeof schema.serviceOfferings.$inferSelect>) {
  if (services.length === 0) return "Public PT services:\n- No public services saved.";
  return [
    "Public PT services:",
    ...services.map(
      (service) =>
        `- ${service.nameEn} (${service.nameVi}): ${formatVnd(service.priceVnd)}, ${service.durationMinutes} minutes; category ${service.category}; ${service.descriptionEn || "no description"}`,
    ),
  ].join("\n");
}

function formatPromotions(promotions: Array<typeof schema.promotions.$inferSelect>) {
  if (promotions.length === 0) return "Public promotions and offers:\n- No public promotions saved.";
  return [
    "Public promotions and offers:",
    ...promotions.map((promo) => {
      const dates = [promo.validFrom, promo.validTo].filter(Boolean).join(" to ");
      return `- ${promo.titleEn} (${promo.titleVi}): ${promo.bonusTermsEn || promo.bodyEn || "no terms"}${dates ? `; valid ${dates}` : ""}`;
    }),
  ].join("\n");
}

function formatEvents(events: Array<typeof schema.publicEvents.$inferSelect>) {
  if (events.length === 0) return "Public events:\n- No public events saved.";
  return [
    "Public events:",
    ...events.map(
      (event) =>
        `- ${event.titleEn} (${event.titleVi}): ${event.eventType}${event.startsAt ? `, starts ${event.startsAt}` : ""}${event.endsAt ? `, ends ${event.endsAt}` : ""}; ${event.descriptionEn || "no description"}`,
    ),
  ].join("\n");
}

function formatPts(
  pts: Array<{
    id: string;
    displayName: string;
    email: string;
    bioEn: string;
    bioVi: string;
    specialtiesEn: string;
    specialtiesVi: string;
    yearsExperience: number;
  }>,
  servicesByPt: Map<string, Array<{ nameEn: string; priceVnd: number; category: string }>>,
) {
  if (pts.length === 0) return "Public PTs:\n- No public PT profiles saved.";
  return [
    "Public PTs:",
    ...pts.map((pt) => {
      const serviceText = (servicesByPt.get(pt.id) ?? [])
        .map((service) => `${service.nameEn} (${formatVnd(service.priceVnd)})`)
        .join(", ");
      return `- ${pt.displayName}: ${pt.yearsExperience} years experience; specialties ${pt.specialtiesEn || pt.specialtiesVi || "not saved"}; ${pt.bioEn || pt.bioVi || "no bio"}${serviceText ? `; services ${serviceText}` : ""}`;
    }),
  ].join("\n");
}

function formatAvailableClasses(
  classes: Array<{
    sessionId: string;
    title: string;
    description: string | null;
    level: string | null;
    trainerName: string | null;
    startsAt: string;
    durationMinutes: number;
    capacity: number;
    bookedCount: number;
    seatsLeft: number;
  }>,
) {
  if (classes.length === 0) return "Available classes:\n- No upcoming classes with seats left.";
  return [
    "Available classes:",
    ...classes.map(
      (item) =>
        `- ${item.title} (${item.sessionId}): starts ${item.startsAt}, ${item.durationMinutes} minutes, ${item.seatsLeft} seats left of ${item.capacity}; trainer ${item.trainerName || "not assigned"}; level ${item.level || "not saved"}; ${item.description || "no description"}`,
    ),
  ].join("\n");
}

function formatMemberState({
  memberships,
  purchaseRequests,
  ptBookings,
  myClassBookings,
  today,
  assignedPt,
}: {
  memberships: Array<{
    id: string;
    planId: string | null;
    planName: string | null;
    status: string;
    startsOn: string;
    endsOn: string;
    priceVndAtPurchase: number;
  }>;
  purchaseRequests: Array<{
    id: string;
    planId: string | null;
    planName: string | null;
    serviceOfferingId: string | null;
    serviceName: string | null;
    status: string;
    message: string;
    requestedStartDate: string | null;
  }>;
  ptBookings: Array<{
    id: string;
    ptName: string | null;
    status: string;
    scheduledAt: string;
    durationMinutes: number;
    notes: string | null;
  }>;
  myClassBookings: Array<{
    bookingId: string;
    status: string;
    sessionId: string;
    title: string;
    startsAt: string;
  }>;
  today: string;
  assignedPt: string;
}) {
  const lines = ["Customer gym state:", `- Assigned PT: ${assignedPt}`];
  if (memberships.length === 0) {
    lines.push("- Active membership: none saved");
  } else {
    for (const membership of memberships) {
      const runtimeStatus = getMembershipRuntimeStatus({
        status: membership.status as MembershipStatus,
        endsOn: membership.endsOn,
        today,
      });
      lines.push(
        `- Membership ${runtimeStatus}: ${membership.planName || membership.planId || "unknown plan"}, ${membership.startsOn} to ${membership.endsOn}, paid ${formatVnd(membership.priceVndAtPurchase)}`,
      );
    }
  }
  if (purchaseRequests.length > 0) {
    lines.push(
      `- Package requests: ${purchaseRequests
        .map((request) => {
          const target =
            request.planName ||
            request.serviceName ||
            request.planId ||
            request.serviceOfferingId ||
            "custom";
          return `${request.status} ${target}${request.requestedStartDate ? ` from ${request.requestedStartDate}` : ""}${request.message ? ` (${request.message})` : ""}`;
        })
        .join("; ")}`,
    );
  }
  const activePtBookings = ptBookings.filter((booking) =>
    ["pending", "rescheduled", "confirmed"].includes(booking.status),
  );
  if (activePtBookings.length > 0) {
    lines.push("Upcoming PT bookings:");
    for (const booking of activePtBookings) {
      lines.push(
        `- ${booking.scheduledAt}: ${booking.status}, ${booking.durationMinutes} minutes with ${booking.ptName || "PT not assigned"}${booking.notes ? `; notes ${booking.notes}` : ""}`,
      );
    }
  }
  const activeClassBookings = myClassBookings.filter((booking) => booking.status === "booked");
  if (activeClassBookings.length > 0) {
    lines.push("My class bookings:");
    for (const booking of activeClassBookings) {
      lines.push(`- ${booking.title} (${booking.sessionId}) at ${booking.startsAt}`);
    }
  }
  return lines.join("\n");
}

function limitText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 16)).trimEnd()}... [truncated]`;
}
