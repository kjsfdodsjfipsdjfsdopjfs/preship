import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://preship:preship_dev@localhost:5432/preship";

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../apps/api/src/models/migrations"
);

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Create migrations tracking table if it does not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await pool.query(
      "SELECT filename FROM _migrations ORDER BY id"
    );
    const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

    // Read migration files from disk
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log(`No migrations directory found at ${MIGRATIONS_DIR}`);
      console.log("Creating directory...");
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      console.log("No migrations to run.");
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let ranCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  [skip] ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

      console.log(`  [run]  ${file}`);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO _migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        ranCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  [FAIL] ${file}:`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    if (ranCount === 0) {
      console.log("All migrations already applied.");
    } else {
      console.log(`\nApplied ${ranCount} migration(s).`);
    }
  } finally {
    await pool.end();
  }
}

console.log("PreShip Migration Runner");
console.log("==========================\n");
console.log(`Database: ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}`);
console.log(`Migrations: ${MIGRATIONS_DIR}\n`);

migrate()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nMigration failed:", err.message);
    process.exit(1);
  });
