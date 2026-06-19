import { and, asc, desc, eq } from "drizzle-orm";
import { hasAnyRole } from "@/lib/roles";
import { getSessionUser, type AuthSession } from "@/server/auth";
import { db, schema } from "@/server/db";

export async function requireManagerSession(): Promise<AuthSession> {
  const session = await getSessionUser();
  if (!session) throw new Response("Unauthorized", { status: 401 });
  if (!hasAnyRole(session, ["admin", "manager"])) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}

export async function getPublicBranches() {
  return await db
    .select()
    .from(schema.branches)
    .where(eq(schema.branches.active, 1))
    .orderBy(asc(schema.branches.createdAt))
    .limit(3);
}

export async function getPublicPlans() {
  return await db
    .select()
    .from(schema.membershipPlans)
    .where(and(eq(schema.membershipPlans.active, 1), eq(schema.membershipPlans.isPublic, 1)))
    .orderBy(asc(schema.membershipPlans.sortOrder), asc(schema.membershipPlans.priceVnd));
}

export async function getPublicServices() {
  return await db
    .select()
    .from(schema.serviceOfferings)
    .where(and(eq(schema.serviceOfferings.active, 1), eq(schema.serviceOfferings.isPublic, 1)))
    .orderBy(asc(schema.serviceOfferings.sortOrder), asc(schema.serviceOfferings.priceVnd));
}

export async function getPublicPromotions() {
  return await db
    .select()
    .from(schema.promotions)
    .where(and(eq(schema.promotions.active, 1), eq(schema.promotions.isPublic, 1)))
    .orderBy(asc(schema.promotions.sortOrder), desc(schema.promotions.createdAt));
}

export async function getPublicEvents() {
  return await db
    .select()
    .from(schema.publicEvents)
    .where(and(eq(schema.publicEvents.active, 1), eq(schema.publicEvents.isPublic, 1)))
    .orderBy(asc(schema.publicEvents.sortOrder), desc(schema.publicEvents.createdAt));
}

export async function getPublicPts() {
  const pts = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      email: schema.users.email,
      bioEn: schema.ptProfiles.bioEn,
      bioVi: schema.ptProfiles.bioVi,
      specialtiesEn: schema.ptProfiles.specialtiesEn,
      specialtiesVi: schema.ptProfiles.specialtiesVi,
      photoPath: schema.ptProfiles.photoPath,
      photoBase64: schema.ptProfiles.photoBase64,
      yearsExperience: schema.ptProfiles.yearsExperience,
    })
    .from(schema.users)
    .leftJoin(schema.ptProfiles, eq(schema.users.id, schema.ptProfiles.userId))
    .where(and(eq(schema.users.role, "pt"), eq(schema.ptProfiles.isPublic, 1)))
    .orderBy(asc(schema.users.displayName));

  const ptServices = await db
    .select({
      ptId: schema.ptServiceOfferings.ptId,
      serviceOfferingId: schema.ptServiceOfferings.serviceOfferingId,
      nameEn: schema.serviceOfferings.nameEn,
      nameVi: schema.serviceOfferings.nameVi,
      category: schema.serviceOfferings.category,
      priceVnd: schema.serviceOfferings.priceVnd,
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
    );

  const servicesByPt = new Map<string, typeof ptServices>();
  for (const row of ptServices) {
    const rows = servicesByPt.get(row.ptId) ?? [];
    rows.push(row);
    servicesByPt.set(row.ptId, rows);
  }

  return pts
    .filter((pt) => pt.bioEn !== null || pt.bioVi !== null)
    .map((pt) => ({
      ...pt,
      services: servicesByPt.get(pt.id) ?? [],
    }));
}

// Used when an admin has not uploaded any gym photos yet, so the public
// gallery still has content out of the box.
const FALLBACK_GYM_PHOTOS = [
  "/photos/481467812_122111636774764018_8371798819188776681_n.jpg",
  "/photos/481657047_122111636780764018_4784941799358332507_n.jpg",
  "/photos/495168973_122129024408764018_826990853331917079_n.jpg",
  "/photos/495540001_122129988302764018_817869673973760177_n.jpg",
  "/photos/495542533_122129024414764018_3394889613596778917_n.jpg",
  "/photos/495563014_122129988278764018_2135127844443924284_n.jpg",
  "/photos/495571170_122129988290764018_2695044397240076606_n.jpg",
  "/photos/639188824_122181929528764018_8757796731002963910_n.jpg",
  "/photos/639228495_122181929462764018_1561807631252042654_n.jpg",
  "/photos/640005466_122181929744764018_2615677100136385583_n.jpg",
  "/photos/640375362_122181929468764018_8761283832063980557_n.jpg",
  "/photos/640390884_122181929828764018_8050131881232956408_n.jpg",
  "/photos/641144499_122181930014764018_7120953354253484948_n.jpg",
  "/photos/641228791_122181929960764018_3565628250650971298_n.jpg",
  "/photos/641265240_122181929612764018_814957938123539768_n.jpg",
  "/photos/641295305_122181929684764018_5237898920015775179_n.jpg",
  "/photos/641489600_122181930062764018_1440486519564106535_n.jpg",
  "/photos/641556618_122181929894764018_3627330532819166118_n.jpg",
  "/photos/641617139_122181929618764018_5164548621257360145_n.jpg",
  "/photos/641698917_122181929786764018_5354028096678290099_n.jpg",
];

export async function getPublicGymPhotos(): Promise<string[]> {
  const rows = await db
    .select({ imageBase64: schema.gymPhotos.imageBase64 })
    .from(schema.gymPhotos)
    .where(eq(schema.gymPhotos.isPublic, 1))
    .orderBy(asc(schema.gymPhotos.sortOrder), asc(schema.gymPhotos.createdAt));
  if (rows.length === 0) return FALLBACK_GYM_PHOTOS;
  return rows.map((row) => row.imageBase64);
}

export async function getPublicLandingContent() {
  const [branches, plans, services, promotions, events, pts, photos] = await Promise.all([
    getPublicBranches(),
    getPublicPlans(),
    getPublicServices(),
    getPublicPromotions(),
    getPublicEvents(),
    getPublicPts(),
    getPublicGymPhotos(),
  ]);

  return {
    branch: branches[0] ?? null,
    plans,
    services,
    promotions,
    events,
    pts,
    photos,
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
