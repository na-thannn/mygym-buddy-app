import { sql } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const auditTimestamp = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("customer"),
  assignedPtId: text("assigned_pt_id"),
  mustChangePassword: integer("must_change_password").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal"),
  level: text("level"),
  limitations: text("limitations"),
  age: integer("age"),
  gender: text("gender"),
  heightCm: doublePrecision("height_cm"),
  weightKg: doublePrecision("weight_kg"),
  targetWeightKg: doublePrecision("target_weight_kg"),
  daysPerWeek: text("days_per_week"),
  equipment: text("equipment"),
  updatedAt: auditTimestamp("updated_at"),
});

export const workoutLogs = pgTable("workout_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  performedAt: text("performed_at").notNull(),
  dayLabel: text("day_label"),
  muscleGroup: text("muscle_group"),
  exercise: text("exercise").notNull(),
  sets: integer("sets"),
  reps: text("reps"),
  weightKg: doublePrecision("weight_kg"),
  notes: text("notes"),
  createdAt: auditTimestamp("created_at"),
});

export const nutritionReports = pgTable("nutrition_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  breakfast: text("breakfast"),
  lunch: text("lunch"),
  dinner: text("dinner"),
  snacks: text("snacks"),
  dayType: text("day_type"),
  preWorkoutMeal: text("pre_workout_meal"),
  postWorkoutMeal: text("post_workout_meal"),
  calories: doublePrecision("calories"),
  proteinG: doublePrecision("protein_g"),
  carbsG: doublePrecision("carbs_g"),
  fatsG: doublePrecision("fats_g"),
  notes: text("notes"),
  createdAt: auditTimestamp("created_at"),
});

export const progressReports = pgTable("progress_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  totalSessions: integer("total_sessions").default(0),
  streakDays: integer("streak_days").default(0),
  totalVolume: doublePrecision("total_volume").default(0),
  notes: text("notes"),
  createdAt: auditTimestamp("created_at"),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ptId: text("pt_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  scheduledAt: text("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  notes: text("notes"),
  cancelledBy: text("cancelled_by"),
  cancellationReason: text("cancellation_reason"),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const guestMeetings = pgTable("guest_meetings", {
  id: text("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone").notNull(),
  goal: text("goal").notNull(),
  experience: text("experience").notNull(),
  daysPerWeek: text("days_per_week"),
  equipment: text("equipment"),
  requestedPtId: text("requested_pt_id").references(() => users.id, { onDelete: "set null" }),
  assignedPtId: text("assigned_pt_id").references(() => users.id, { onDelete: "set null" }),
  scheduledAt: text("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  usedFallback: integer("used_fallback").notNull().default(0),
  meetingType: text("meeting_type").notNull().default("in_person"),
  onlineMeetingUrl: text("online_meeting_url"),
  zaloUserId: text("zalo_user_id"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true, mode: "string" }),
  status: text("status").notNull().default("confirmed"),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at", {
    withTimezone: true,
    mode: "string",
  }),
  loginEmailSentAt: timestamp("login_email_sent_at", { withTimezone: true, mode: "string" }),
  createdUserId: text("created_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const ptUnavailabilityBlocks = pgTable("pt_unavailability_blocks", {
  id: text("id").primaryKey(),
  ptId: text("pt_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  unavailableDate: text("unavailable_date").notNull(),
  allDay: integer("all_day").notNull().default(1),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason"),
  createdAt: auditTimestamp("created_at"),
});

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default("customer"),
  status: text("status").notNull().default("open"),
  assignedManagerId: text("assigned_manager_id").references(() => users.id, {
    onDelete: "set null",
  }),
  assignedPtId: text("assigned_pt_id").references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const groupClasses = pgTable("group_classes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  level: text("level"),
  active: integer("active").notNull().default(1),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const groupClassSessions = pgTable("group_class_sessions", {
  id: text("id").primaryKey(),
  classId: text("class_id")
    .notNull()
    .references(() => groupClasses.id, { onDelete: "cascade" }),
  trainerId: text("trainer_id").references(() => users.id, { onDelete: "set null" }),
  startsAt: text("starts_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  capacity: integer("capacity").notNull().default(12),
  status: text("status").notNull().default("scheduled"),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const groupClassBookings = pgTable("group_class_bookings", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => groupClassSessions.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("booked"),
  attendedAt: timestamp("attended_at", { withTimezone: true, mode: "string" }),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const workoutPlanDocs = pgTable("workout_plan_docs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(),
  title: text("title"),
  contentMd: text("content_md").notNull(),
  createdAt: auditTimestamp("created_at"),
});

export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: auditTimestamp("created_at"),
});

export const chatThreads = pgTable("chat_threads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  contentJson: text("content_json").notNull(),
  createdAt: auditTimestamp("created_at"),
});

export const inbodyReports = pgTable("inbody_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  weightKg: doublePrecision("weight_kg").notNull(),
  muscleMassKg: doublePrecision("muscle_mass_kg").notNull(),
  bodyFatPercent: doublePrecision("body_fat_percent").notNull(),
  imageBase64: text("image_base64"),
  source: text("source").notNull().default("manual"),
  createdAt: auditTimestamp("created_at"),
});

export const communityFeed = pgTable("community_feed", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageBase64: text("image_base64"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
});

export const feedLikes = pgTable(
  "feed_likes",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => communityFeed.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: auditTimestamp("created_at"),
  },
  (table) => [uniqueIndex("feed_likes_post_user_idx").on(table.postId, table.userId)],
);

export const progressPhotos = pgTable("progress_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imageBase64: text("image_base64").notNull(),
  createdAt: auditTimestamp("created_at"),
});

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameVi: text("name_vi").notNull(),
  addressEn: text("address_en").notNull(),
  addressVi: text("address_vi").notNull(),
  phone: text("phone").notNull(),
  hoursEn: text("hours_en").notNull(),
  hoursVi: text("hours_vi").notNull(),
  mapUrl: text("map_url").notNull().default(""),
  facebookUrl: text("facebook_url").notNull().default(""),
  heroImagePath: text("hero_image_path"),
  active: integer("active").notNull().default(1),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const membershipPlans = pgTable("membership_plans", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameVi: text("name_vi").notNull(),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionVi: text("description_vi").notNull().default(""),
  audience: text("audience").notNull().default("general"),
  priceVnd: integer("price_vnd").notNull(),
  durationDays: integer("duration_days").notNull(),
  bonusDays: integer("bonus_days").notNull().default(0),
  includesPtSessions: integer("includes_pt_sessions").notNull().default(0),
  active: integer("active").notNull().default(1),
  isPublic: integer("is_public").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const serviceOfferings = pgTable("service_offerings", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameVi: text("name_vi").notNull(),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionVi: text("description_vi").notNull().default(""),
  category: text("category").notNull().default("training"),
  priceVnd: integer("price_vnd").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  active: integer("active").notNull().default(1),
  isPublic: integer("is_public").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const ptProfiles = pgTable("pt_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bioEn: text("bio_en").notNull().default(""),
  bioVi: text("bio_vi").notNull().default(""),
  specialtiesEn: text("specialties_en").notNull().default(""),
  specialtiesVi: text("specialties_vi").notNull().default(""),
  photoPath: text("photo_path"),
  photoBase64: text("photo_base64"),
  yearsExperience: integer("years_experience").notNull().default(0),
  isPublic: integer("is_public").notNull().default(1),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const ptServiceOfferings = pgTable(
  "pt_service_offerings",
  {
    ptId: text("pt_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceOfferingId: text("service_offering_id")
      .notNull()
      .references(() => serviceOfferings.id, { onDelete: "cascade" }),
    active: integer("active").notNull().default(1),
    createdAt: auditTimestamp("created_at"),
  },
  (table) => [primaryKey({ columns: [table.ptId, table.serviceOfferingId] })],
);

export const promotions = pgTable("promotions", {
  id: text("id").primaryKey(),
  titleEn: text("title_en").notNull(),
  titleVi: text("title_vi").notNull(),
  bodyEn: text("body_en").notNull().default(""),
  bodyVi: text("body_vi").notNull().default(""),
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  bonusTermsEn: text("bonus_terms_en").notNull().default(""),
  bonusTermsVi: text("bonus_terms_vi").notNull().default(""),
  relatedPlanId: text("related_plan_id").references(() => membershipPlans.id, {
    onDelete: "set null",
  }),
  relatedServiceId: text("related_service_id").references(() => serviceOfferings.id, {
    onDelete: "set null",
  }),
  active: integer("active").notNull().default(1),
  isPublic: integer("is_public").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const publicEvents = pgTable("public_events", {
  id: text("id").primaryKey(),
  titleEn: text("title_en").notNull(),
  titleVi: text("title_vi").notNull(),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionVi: text("description_vi").notNull().default(""),
  eventType: text("event_type").notNull().default("class"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  imagePath: text("image_path"),
  relatedClassId: text("related_class_id").references(() => groupClasses.id, {
    onDelete: "set null",
  }),
  active: integer("active").notNull().default(1),
  isPublic: integer("is_public").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").references(() => membershipPlans.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  priceVndAtPurchase: integer("price_vnd_at_purchase").notNull().default(0),
  assignedPtId: text("assigned_pt_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const purchaseRequests = pgTable("purchase_requests", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").references(() => membershipPlans.id, { onDelete: "set null" }),
  serviceOfferingId: text("service_offering_id").references(() => serviceOfferings.id, {
    onDelete: "set null",
  }),
  preferredPtId: text("preferred_pt_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("requested"),
  message: text("message").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  requestedStartDate: text("requested_start_date"),
  source: text("source").notNull().default("customer"),
  handledBy: text("handled_by").references(() => users.id, { onDelete: "set null" }),
  handledAt: timestamp("handled_at", { withTimezone: true, mode: "string" }),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const manualPayments = pgTable("manual_payments", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  membershipId: text("membership_id").references(() => memberships.id, { onDelete: "set null" }),
  purchaseRequestId: text("purchase_request_id").references(() => purchaseRequests.id, {
    onDelete: "set null",
  }),
  amountVnd: integer("amount_vnd").notNull(),
  method: text("method").notNull().default("cash"),
  status: text("status").notNull().default("recorded"),
  paidOn: text("paid_on").notNull(),
  recordedBy: text("recorded_by").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: auditTimestamp("created_at"),
});

export const crmNotes = pgTable("crm_notes", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note").notNull(),
  createdAt: auditTimestamp("created_at"),
});

export const feedComments = pgTable("feed_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => communityFeed.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isAgent: integer("is_agent").notNull().default(0),
  macrosJson: text("macros_json"),
  createdAt: auditTimestamp("created_at"),
});

export const gymPhotos = pgTable("gym_photos", {
  id: text("id").primaryKey(),
  imageBase64: text("image_base64").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublic: integer("is_public").notNull().default(1),
  createdAt: auditTimestamp("created_at"),
  updatedAt: auditTimestamp("updated_at"),
});

export const dailyMotivation = pgTable(
  "daily_motivation",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forDate: text("for_date").notNull(),
    message: text("message").notNull(),
    createdAt: auditTimestamp("created_at"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.forDate] })],
);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  createdAt: auditTimestamp("created_at"),
});

export const schemaVersion = sql`1`;
