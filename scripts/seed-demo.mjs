import { scryptSync, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://hlfitness:hlfitness@localhost:5432/hlfitness";
const { Client } = pg;

const client = new Client({ connectionString: DATABASE_URL });

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function runMigrations() {
  const migrationsDir = resolve(process.cwd(), "drizzle");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await client.query(statement);
    }
  }
}

async function upsert(table, values, conflict = "id") {
  const keys = Object.keys(values);
  const columns = keys.map((key) => snake(key));
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const updates = columns
    .filter((column) => column !== conflict)
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(", ");
  await client.query(
    `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (${conflict}) DO UPDATE SET ${updates}
    `,
    keys.map((key) => values[key]),
  );
}

function snake(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

async function main() {
  await client.connect();
  const schemaCheck = await client.query("select to_regclass('public.users') as users_table");
  if (!schemaCheck.rows[0]?.users_table) {
    await runMigrations();
  }

  const passwordHash = hashPassword("password123");
  const users = [
    {
      id: "demo-admin",
      email: "admin@hlfitness.test",
      passwordHash,
      displayName: "HL Admin",
      role: "admin",
      assignedPtId: null,
      mustChangePassword: 0,
    },
    {
      id: "demo-manager",
      email: "manager@hlfitness.test",
      passwordHash,
      displayName: "HL Manager",
      role: "manager",
      assignedPtId: null,
      mustChangePassword: 0,
    },
    {
      id: "demo-pt-linh",
      email: "linh.pt@hlfitness.test",
      passwordHash,
      displayName: "Coach Linh",
      role: "pt",
      assignedPtId: null,
      mustChangePassword: 0,
    },
    {
      id: "demo-pt-minh",
      email: "minh.pt@hlfitness.test",
      passwordHash,
      displayName: "Coach Minh",
      role: "pt",
      assignedPtId: null,
      mustChangePassword: 0,
    },
    {
      id: "demo-customer",
      email: "member@hlfitness.test",
      passwordHash,
      displayName: "Demo Member",
      role: "customer",
      assignedPtId: "demo-pt-linh",
      mustChangePassword: 0,
    },
  ];
  for (const user of users) await upsert("users", user);

  await upsert(
    "branches",
    {
      id: "hl-main",
      nameEn: "HL Fitness",
      nameVi: "HL Fitness",
      addressEn: "303 Le Thanh Nghi, Da Nang",
      addressVi: "303 Le Thanh Nghi, Da Nang",
      phone: "Phone pending verified Google Maps/Facebook source",
      hoursEn: "Open daily. Final hours pending verification from Google Maps/Facebook links.",
      hoursVi:
        "Mo cua hang ngay. Gio chinh xac can xac minh tu Google Maps/Facebook.",
      mapUrl: "",
      facebookUrl: "",
      heroImagePath:
        "/photos/641295305_122181929684764018_5237898920015775179_n.jpg",
      active: 1,
    },
  );

  const plans = [
    {
      id: "student-monthly",
      nameEn: "Student Monthly",
      nameVi: "Goi thang HS/SV",
      descriptionEn: "Student-friendly monthly access based on current HL Fitness plan graphics.",
      descriptionVi: "Goi tap thang uu dai cho hoc sinh, sinh vien.",
      audience: "student",
      priceVnd: 180000,
      durationDays: 30,
      bonusDays: 0,
      includesPtSessions: 0,
      active: 1,
      isPublic: 1,
      sortOrder: 10,
    },
    {
      id: "standard-monthly",
      nameEn: "Standard Monthly",
      nameVi: "Goi thang tieu chuan",
      descriptionEn: "Monthly gym access for general members.",
      descriptionVi: "Goi tap thang cho hoi vien pho thong.",
      audience: "general",
      priceVnd: 200000,
      durationDays: 30,
      bonusDays: 0,
      includesPtSessions: 0,
      active: 1,
      isPublic: 1,
      sortOrder: 20,
    },
    {
      id: "pt-one-one-month",
      nameEn: "PT 1-1 Monthly Package",
      nameVi: "Goi PT 1-1 theo thang",
      descriptionEn: "One-on-one personal training package with assigned PT support.",
      descriptionVi: "Goi tap ca nhan 1-1 voi PT phu trach.",
      audience: "pt",
      priceVnd: 2500000,
      durationDays: 30,
      bonusDays: 0,
      includesPtSessions: 12,
      active: 1,
      isPublic: 1,
      sortOrder: 30,
    },
  ];
  for (const plan of plans) await upsert("membership_plans", plan);

  const services = [
    {
      id: "pt-one-one-service",
      nameEn: "PT 1-1 Coaching",
      nameVi: "HLV ca nhan 1-1",
      descriptionEn: "Personal training with form checks, planning, and accountability.",
      descriptionVi: "Tap cung HLV ca nhan, sua ky thuat va theo sat tien do.",
      category: "personal_training",
      priceVnd: 2500000,
      durationMinutes: 60,
      active: 1,
      isPublic: 1,
      sortOrder: 10,
    },
    {
      id: "intro-assessment",
      nameEn: "Intro Assessment",
      nameVi: "Buoi danh gia ban dau",
      descriptionEn: "Goal, schedule, and training-level consultation before starting.",
      descriptionVi: "Tu van muc tieu, lich tap va trinh do truoc khi bat dau.",
      category: "consultation",
      priceVnd: 0,
      durationMinutes: 30,
      active: 1,
      isPublic: 1,
      sortOrder: 20,
    },
  ];
  for (const service of services) await upsert("service_offerings", service);

  const promotions = [
    {
      id: "promo-pay-3-get-1",
      titleEn: "Pay 3 months, get 1 month",
      titleVi: "Dong 3 thang tang 1 thang",
      bodyEn: "Promotion from current HL Fitness plan graphics.",
      bodyVi: "Uu dai theo hinh anh goi tap hien co cua HL Fitness.",
      bonusTermsEn: "Bonus 30 days when paying 3 months upfront.",
      bonusTermsVi: "Tang them 30 ngay khi dong truoc 3 thang.",
      relatedPlanId: "standard-monthly",
      relatedServiceId: null,
      active: 1,
      isPublic: 1,
      sortOrder: 10,
    },
    {
      id: "promo-pay-6-get-70",
      titleEn: "Pay 6 months, get 70 bonus days",
      titleVi: "Dong 6 thang tang 70 ngay",
      bodyEn: "Longer commitment promotion from current HL Fitness plan graphics.",
      bodyVi: "Uu dai cam ket dai han theo hinh anh goi tap hien co.",
      bonusTermsEn: "Bonus 70 days when paying 6 months upfront.",
      bonusTermsVi: "Tang them 70 ngay khi dong truoc 6 thang.",
      relatedPlanId: "standard-monthly",
      relatedServiceId: null,
      active: 1,
      isPublic: 1,
      sortOrder: 20,
    },
  ];
  for (const promotion of promotions) await upsert("promotions", promotion);

  const ptProfiles = [
    {
      userId: "demo-pt-linh",
      bioEn: "Strength and beginner-friendly body recomposition coach.",
      bioVi: "HLV suc manh va cai thien hinh the than thien cho nguoi moi.",
      specialtiesEn: "Strength basics, fat loss, habit building",
      specialtiesVi: "Nen tang suc manh, giam mo, xay dung thoi quen",
      photoPath:
        "/photos/641489600_122181930062764018_1440486519564106535_n.jpg",
      yearsExperience: 4,
      isPublic: 1,
    },
    {
      userId: "demo-pt-minh",
      bioEn: "Hypertrophy and PT 1-1 accountability coach.",
      bioVi: "HLV tang co va theo sat 1-1.",
      specialtiesEn: "Muscle gain, technique, progressive overload",
      specialtiesVi: "Tang co, ky thuat, tang tai tien bo",
      photoPath:
        "/photos/641556618_122181929894764018_3627330532819166118_n.jpg",
      yearsExperience: 5,
      isPublic: 1,
    },
  ];
  for (const profile of ptProfiles) await upsert("pt_profiles", profile, "user_id");

  await client.query("DELETE FROM pt_service_offerings WHERE pt_id LIKE 'demo-pt-%'");
  for (const ptId of ["demo-pt-linh", "demo-pt-minh"]) {
    await client.query(
      `
        INSERT INTO pt_service_offerings (pt_id, service_offering_id, active)
        VALUES ($1, 'pt-one-one-service', 1), ($1, 'intro-assessment', 1)
        ON CONFLICT (pt_id, service_offering_id) DO UPDATE SET active=EXCLUDED.active
      `,
      [ptId],
    );
  }

  const events = [
    {
      id: "event-student-promo",
      titleEn: "Student Membership Week",
      titleVi: "Tuan uu dai HS/SV",
      descriptionEn: "Ask the manager about the 180K monthly student plan.",
      descriptionVi: "Hoi quan ly ve goi HS/SV 180K/thang.",
      eventType: "promotion",
      imagePath:
        "/photos/641295305_122181929684764018_5237898920015775179_n.jpg",
      active: 1,
      isPublic: 1,
      sortOrder: 10,
    },
    {
      id: "event-technique-workshop",
      titleEn: "PT Technique Check",
      titleVi: "Kiem tra ky thuat cung PT",
      descriptionEn: "Small-group form review for new and returning members.",
      descriptionVi: "Buoi sua ky thuat nhom nho cho hoi vien moi va cu.",
      eventType: "workshop",
      imagePath:
        "/photos/495563014_122129988278764018_2135127844443924284_n.jpg",
      active: 1,
      isPublic: 1,
      sortOrder: 20,
    },
  ];
  for (const event of events) await upsert("public_events", event);

  await upsert(
    "memberships",
    {
      id: "demo-membership-active",
      customerId: "demo-customer",
      planId: "pt-one-one-month",
      status: "active",
      startsOn: "2026-06-01",
      endsOn: "2026-06-30",
      priceVndAtPurchase: 2500000,
      assignedPtId: "demo-pt-linh",
      notes: "Seeded active PT package.",
    },
  );

  await upsert(
    "purchase_requests",
    {
      id: "demo-request-standard",
      customerId: "demo-customer",
      planId: "standard-monthly",
      serviceOfferingId: null,
      preferredPtId: "demo-pt-minh",
      status: "requested",
      message: "Interested in extending after current PT package.",
      contactPhone: "0900000000",
      requestedStartDate: "2026-07-01",
      source: "customer",
    },
  );

  await upsert(
    "manual_payments",
    {
      id: "demo-payment-pt",
      customerId: "demo-customer",
      membershipId: "demo-membership-active",
      purchaseRequestId: null,
      amountVnd: 2500000,
      method: "cash",
      status: "recorded",
      paidOn: "2026-06-01",
      recordedBy: "demo-manager",
      note: "Seeded manual PT payment.",
    },
  );

  console.log("Seeded HL Fitness Postgres demo data.");
  console.log("Demo logins use password: password123");
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => {});
  process.exit(1);
});
