import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("customer"),
  assignedPtId: text("assigned_pt_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(), // unix seconds
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal"),
  level: text("level"), // Beginner | Intermediate | Advanced
  limitations: text("limitations"),
  age: integer("age"),
  gender: text("gender"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  targetWeightKg: real("target_weight_kg"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const workoutLogs = sqliteTable("workout_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  performedAt: text("performed_at").notNull(), // YYYY-MM-DD
  dayLabel: text("day_label"), // Monday, Tuesday, ...
  muscleGroup: text("muscle_group"),
  exercise: text("exercise").notNull(),
  sets: integer("sets"),
  reps: text("reps"), // string allows "8-12"
  weightKg: real("weight_kg"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const nutritionReports = sqliteTable("nutrition_reports", {
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
  calories: real("calories"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatsG: real("fats_g"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const progressReports = sqliteTable("progress_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  totalSessions: integer("total_sessions").default(0),
  streakDays: integer("streak_days").default(0),
  totalVolume: real("total_volume").default(0),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const bookings = sqliteTable("bookings", {
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
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default("customer"),
  status: text("status").notNull().default("open"),
  assignedStaffId: text("assigned_staff_id").references(() => users.id, { onDelete: "set null" }),
  assignedPtId: text("assigned_pt_id").references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const groupClasses = sqliteTable("group_classes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  level: text("level"),
  active: integer("active").notNull().default(1),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const groupClassSessions = sqliteTable("group_class_sessions", {
  id: text("id").primaryKey(),
  classId: text("class_id")
    .notNull()
    .references(() => groupClasses.id, { onDelete: "cascade" }),
  trainerId: text("trainer_id").references(() => users.id, { onDelete: "set null" }),
  startsAt: text("starts_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  capacity: integer("capacity").notNull().default(12),
  status: text("status").notNull().default("scheduled"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const groupClassBookings = sqliteTable("group_class_bookings", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => groupClassSessions.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("booked"),
  attendedAt: text("attended_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const workoutPlanDocs = sqliteTable("workout_plan_docs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(),
  title: text("title"),
  contentMd: text("content_md").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const analyses = sqliteTable("analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(),
  contentMd: text("content_md").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const chatThreads = sqliteTable("chat_threads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | system
  // Stores full UIMessage JSON (parts array etc.) so we can restore tool calls / results.
  contentJson: text("content_json").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const inbodyReports = sqliteTable("inbody_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  weightKg: real("weight_kg").notNull(),
  muscleMassKg: real("muscle_mass_kg").notNull(),
  bodyFatPercent: real("body_fat_percent").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const communityFeed = sqliteTable("community_feed", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageBase64: text("image_base64"),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const progressPhotos = sqliteTable("progress_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imageBase64: text("image_base64").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
