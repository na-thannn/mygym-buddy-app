import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { hasAnyRole } from "@/lib/roles";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { json } from "@/server/crm";

const importSchema = z.object({
  ptId: z.string().optional(),
  fileBase64: z.string().min(1).optional(),
  rows: z
    .array(
      z.object({
        unavailableDate: z.string(),
        reason: z.string().optional().nullable(),
      }),
    )
    .optional(),
  confirm: z.boolean().optional().default(false),
});

type PreviewRow = {
  unavailableDate: string;
  reason: string | null;
  valid: boolean;
  duplicate: boolean;
  errors: string[];
};

export const Route = createFileRoute("/api/pt-unavailable-days/import-preview")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = importSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        if (session.role !== "pt" && !hasAnyRole(session, ["admin", "manager"])) {
          return json({ error: "Forbidden" }, 403);
        }
        const ptId = hasAnyRole(session, ["admin", "manager"])
          ? parsed.data.ptId
          : session.userId;
        if (!ptId) return json({ error: "ptId required" }, 400);

        const sourceRows = parsed.data.rows ?? readRowsFromWorkbook(parsed.data.fileBase64);
        const existing = await db
          .select({
            unavailableDate: schema.ptUnavailableDays.unavailableDate,
          })
          .from(schema.ptUnavailableDays)
          .where(eq(schema.ptUnavailableDays.ptId, ptId));
        const existingDates = new Set(existing.map((row) => row.unavailableDate));
        const seenDates = new Set<string>();
        const preview: PreviewRow[] = sourceRows.map((row) => {
          const unavailableDate = normalizeDate(row.unavailableDate);
          const errors: string[] = [];
          if (!unavailableDate) errors.push("Date must be YYYY-MM-DD or a valid Excel date");
          const duplicate =
            Boolean(unavailableDate && existingDates.has(unavailableDate)) ||
            Boolean(unavailableDate && seenDates.has(unavailableDate));
          if (unavailableDate) seenDates.add(unavailableDate);
          return {
            unavailableDate: unavailableDate ?? String(row.unavailableDate ?? ""),
            reason: row.reason?.trim() || null,
            valid: errors.length === 0,
            duplicate,
            errors,
          };
        });

        if (parsed.data.confirm) {
          const importable = preview.filter((row) => row.valid && !row.duplicate);
          if (importable.length > 0) {
            await db.insert(schema.ptUnavailableDays).values(
              importable.map((row) => ({
                id: newId(),
                ptId,
                unavailableDate: row.unavailableDate,
                reason: row.reason,
              })),
            );
          }
          return json({ ok: true, imported: importable.length, preview });
        }

        return json({
          ok: true,
          imported: 0,
          preview,
          summary: {
            total: preview.length,
            valid: preview.filter((row) => row.valid).length,
            duplicates: preview.filter((row) => row.duplicate).length,
          },
        });
      },
    },
  },
});

function readRowsFromWorkbook(fileBase64?: string) {
  if (!fileBase64) return [];
  const workbook = XLSX.read(Buffer.from(fileBase64, "base64"), { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => ({
    unavailableDate: String(
      row.unavailableDate ?? row.date ?? row.Date ?? row["Unavailable Date"] ?? "",
    ),
    reason:
      typeof (row.reason ?? row.Reason) === "string" ? String(row.reason ?? row.Reason) : null,
  }));
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
