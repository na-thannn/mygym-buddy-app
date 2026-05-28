import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const dbPath = process.env.SQLITE_PATH ?? resolve(process.cwd(), "data/app.db");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Inline migrations — runs on every boot, idempotent (CREATE TABLE IF NOT EXISTS).
const ddl = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  assigned_pt_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT,
  level TEXT,
  limitations TEXT,
  age INTEGER,
  gender TEXT,
  height_cm REAL,
  weight_kg REAL,
  target_weight_kg REAL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  performed_at TEXT NOT NULL,
  day_label TEXT,
  muscle_group TEXT,
  exercise TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight_kg REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workout_user_date ON workout_logs(user_id, performed_at);
CREATE TABLE IF NOT EXISTS nutrition_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL,
  breakfast TEXT,
  lunch TEXT,
  dinner TEXT,
  snacks TEXT,
  day_type TEXT,
  pre_workout_meal TEXT,
  post_workout_meal TEXT,
  calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fats_g REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workout_plan_docs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  title TEXT,
  content_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plan_user_date ON workout_plan_docs(user_id, plan_date);
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pt_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pt ON bookings(pt_id);
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_pt_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_staff ON support_tickets(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_support_pt ON support_tickets(assigned_pt_id);
CREATE TABLE IF NOT EXISTS group_classes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS group_class_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  trainer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_group_sessions_class ON group_class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_trainer ON group_class_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_starts ON group_class_sessions(starts_at);
CREATE TABLE IF NOT EXISTS group_class_bookings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES group_class_sessions(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked',
  attended_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_group_bookings_session ON group_class_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_customer ON group_class_bookings(customer_id);
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_threads_user ON chat_threads(user_id);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_msg_thread ON chat_messages(thread_id);
CREATE TABLE IF NOT EXISTS inbody_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  muscle_mass_kg REAL NOT NULL,
  body_fat_percent REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS community_feed (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_base64 TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
sqlite.exec(ddl);

// Lightweight column migrations for local SQLite.
try {
  sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
} catch {}
try {
  sqlite.exec("ALTER TABLE users ADD COLUMN assigned_pt_id TEXT");
} catch {}
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
} catch {}
try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_users_assigned_pt ON users(assigned_pt_id)");
} catch {}

export const db = drizzle(sqlite, { schema });
export { schema };
