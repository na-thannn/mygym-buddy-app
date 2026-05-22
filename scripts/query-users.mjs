import Database from 'better-sqlite3';
import { resolve } from 'node:path';
const dbPath = process.env.SQLITE_PATH ?? resolve(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath, { readonly: true });
try {
  const rows = db.prepare('SELECT id, email, display_name, password_hash, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
  console.log('dbPath:', dbPath);
  console.log('rows:', JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('error querying db:', err);
} finally {
  db.close();
}
