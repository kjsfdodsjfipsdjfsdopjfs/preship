import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://preship:preship_dev@localhost:5432/preship";

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log("Seeding database...\n");

    // ── Test User ──────────────────────────────────────────────────────
    const userId = uuidv4();
    // Generate a strong random password for the seed user
    const seedPassword = crypto.randomBytes(24).toString("base64url");
    const passwordHash = await bcrypt.hash(seedPassword, 10);

    await pool.query(
      `INSERT INTO users (id, email, name, password_hash, plan, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash`,
      [userId, "test@preship.dev", "Test User", passwordHash, "free"]
    );
    console.log(`  [user]    test@preship.dev / ${seedPassword}`);

    // ── Test Project ───────────────────────────────────────────────────
    const projectId = uuidv4();

    await pool.query(
      `INSERT INTO projects (id, user_id, name, url, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [projectId, userId, "My Test App", "https://example.com"]
    );
    console.log("  [project] My Test App (https://example.com)");

    // ── Sample Scan ────────────────────────────────────────────────────
    const scanId = uuidv4();
    const sampleResults = {
      url: "https://example.com",
      scannedAt: new Date().toISOString(),
      pagesScanned: 3,
      duration: 4523,
      overallScore: 72,
      categories: [
        { category: "accessibility", score: 65, violations: 8, passed: 42 },
        { category: "security", score: 82, violations: 3, passed: 27 },
        { category: "performance", score: 69, violations: 5, passed: 18 },
      ],
      violations: [
        {
          id: "a11y-img-alt-001",
          category: "accessibility",
          severity: "critical",
          rule: "image-alt",
          message: "Images must have alternate text",
          selector: "img.hero-image",
          url: "https://example.com",
        },
        {
          id: "sec-csp-header-001",
          category: "security",
          severity: "high",
          rule: "missing-content-security-policy",
          message: "Content-Security-Policy header is missing",
          url: "https://example.com",
        },
        {
          id: "perf-render-blocking-001",
          category: "performance",
          severity: "medium",
          rule: "render-blocking-scripts",
          message: "Eliminate render-blocking resources",
          selector: "link[rel=stylesheet]",
          url: "https://example.com",
        },
      ],
    };

    await pool.query(
      `INSERT INTO scans (id, user_id, project_id, url, status, score, results, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [
        scanId,
        userId,
        projectId,
        "https://example.com",
        "completed",
        72,
        JSON.stringify(sampleResults),
      ]
    );
    console.log("  [scan]    Completed scan (score: 72)");

    console.log("\nSeed complete.");
  } finally {
    await pool.end();
  }
}

console.log("PreShip Database Seeder");
console.log("=========================\n");
console.log(`Database: ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}\n`);

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
