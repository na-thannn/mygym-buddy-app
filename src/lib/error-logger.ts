import { promises as fs } from 'fs';
import { dirname } from 'path';

const LOG_PATH = 'logs/dev-errors.log';

async function ensureDir(path: string) {
  try {
    await fs.mkdir(dirname(path), { recursive: true });
  } catch (e) {
    // ignore
  }
}

function serializeError(error: unknown) {
  if (!error) return String(error);
  if (error instanceof Error) return error.stack ?? error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function logDevError(payload: { error: unknown; req?: { method?: string; url?: string; headers?: Record<string, string> } | null }) {
  try {
    await ensureDir(LOG_PATH);
    const p = {
      ts: new Date().toISOString(),
      error: serializeError(payload.error),
      req: payload.req ?? null,
    };
    await fs.appendFile(LOG_PATH, JSON.stringify(p) + '\n', 'utf8');
  } catch (e) {
    // best effort
    console.error('Failed to write dev error log', e);
  }
}

export default logDevError;
