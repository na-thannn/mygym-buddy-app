import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { DataType, newDb } from "pg-mem";
import { resolve } from "node:path";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "postgres://hlfitness:hlfitness@localhost:5432/hlfitness";
const migrationsFolder = resolve(process.cwd(), "drizzle");
const isTestRuntime = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

function createMemoryPool(): pg.Pool {
  const memoryDb = newDb({ autoCreateForeignKeyIndices: true });
  memoryDb.public.registerFunction({
    name: "current_database",
    returns: DataType.text,
    implementation: () => "hlfitness_test",
  });
  memoryDb.public.registerFunction({
    name: "version",
    returns: DataType.text,
    implementation: () => "PostgreSQL 16.0 (pg-mem)",
  });
  const adapter = memoryDb.adapters.createPg();
  const memoryPool = new adapter.Pool();
  return patchPgMemPool(memoryPool) as unknown as pg.Pool;
}

function withoutUnsupportedPgMemTypes(config: unknown) {
  if (!config || typeof config !== "object") return config;
  if (!("types" in config) && !("rowMode" in config)) return config;
  const { types: _types, rowMode: _rowMode, ...queryConfig } = config as Record<string, unknown>;
  return queryConfig;
}

function wantsArrayRows(config: unknown) {
  return Boolean(
    config &&
      typeof config === "object" &&
      "rowMode" in config &&
      (config as { rowMode?: unknown }).rowMode === "array",
  );
}

function adaptPgMemRows(config: unknown, result: unknown) {
  if (!wantsArrayRows(config) || !result || typeof result !== "object" || !("rows" in result)) {
    return result;
  }

  const typedResult = result as { rows: unknown[]; fields?: Array<{ name: string }> };
  typedResult.rows = typedResult.rows.map((row) => {
    if (Array.isArray(row) || !row || typeof row !== "object") return row;
    const record = row as Record<string, unknown>;
    const names = typedResult.fields?.map((field) => field.name) ?? Object.keys(record);
    if (
      names.length !== Object.keys(record).length ||
      !names.every((name) => Object.prototype.hasOwnProperty.call(record, name))
    ) {
      return Object.values(record);
    }
    return names.map((name) => record[name]);
  });
  return typedResult;
}

function patchPgMemQueryTarget<T extends { query: (...args: unknown[]) => unknown }>(target: T): T {
  const query = target.query.bind(target);
  target.query = ((config: unknown, ...args: unknown[]) => {
    const result = query(withoutUnsupportedPgMemTypes(config), ...args);
    if (result && typeof result === "object" && "then" in result) {
      return (result as Promise<unknown>).then((value) => adaptPgMemRows(config, value));
    }
    return adaptPgMemRows(config, result);
  }) as T["query"];
  return target;
}

function patchPgMemPool<T extends { connect: (...args: unknown[]) => Promise<unknown> } & {
  query: (...args: unknown[]) => unknown;
}>(pool: T): T {
  patchPgMemQueryTarget(pool);
  const connect = pool.connect.bind(pool);
  pool.connect = (async (...args: unknown[]) => {
    const client = await connect(...args);
    if (client && typeof client === "object" && "query" in client) {
      return patchPgMemQueryTarget(client as { query: (...queryArgs: unknown[]) => unknown });
    }
    return client;
  }) as T["connect"];
  return pool;
}

function createPool(): pg.Pool {
  if (isTestRuntime) return createMemoryPool();
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    max: 10,
  });
}

export const pool = createPool();
export const db = drizzle(pool, { schema });

await migrate(db, { migrationsFolder });

export async function resetDatabaseForTests() {
  if (!isTestRuntime) {
    throw new Error("resetDatabaseForTests can only run in Vitest/test mode");
  }

  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs,
      manual_payments,
      memberships,
      purchase_requests,
      public_events,
      promotions,
      pt_service_offerings,
      pt_profiles,
      service_offerings,
      membership_plans,
      branches,
      progress_photos,
      community_feed,
      inbody_reports,
      chat_messages,
      chat_threads,
      analyses,
      workout_plan_docs,
      group_class_bookings,
      group_class_sessions,
      group_classes,
      support_tickets,
      pt_unavailable_days,
      guest_meetings,
      bookings,
      progress_reports,
      nutrition_reports,
      workout_logs,
      profiles,
      sessions,
      users
    RESTART IDENTITY CASCADE
  `);
}

export { schema };
