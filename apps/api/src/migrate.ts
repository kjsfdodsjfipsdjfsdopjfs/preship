/**
 * Simple migration runner for PostgreSQL.
 *
 * - Creates a _migrations table if it does not exist.
 * - Reads .sql files from the migrations/ directory.
 * - Applies unapplied migrations in filename order.
 * - Each migration runs inside a transaction.
 *
 * Called on app startup before the server begins listening.
 */

import fs from "fs";
import path from "path";
import { pool } from "./models/index";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(): Promise<void> {
  console.log("[migrate] Checking for pending migrations...");

  // Ensure the _migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Determine which SQL files exist on disk
  let files: string[];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // lexicographic sort gives us 001_, 002_, … ordering
  } catch {
    console.log("[migrate] No migrations directory found, skipping.");
    return;
  }

  if (files.length === 0) {
    console.log("[migrate] No migration files found.");
    return;
  }

  // Fetch already-applied migrations
  const { rows: applied } = await pool.query<{ name: string }>(
    "SELECT name FROM _migrations ORDER BY name"
  );
  const appliedSet = new Set(applied.map((r) => r.name));

  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log("[migrate] All migrations already applied.");
    return;
  }

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`[migrate] Applying ${file}...`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] Applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] Failed to apply ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`[migrate] ${pending.length} migration(s) applied successfully.`);
}
