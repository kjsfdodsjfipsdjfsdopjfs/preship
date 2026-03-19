/**
 * Admin dashboard API routes.
 * Protected by hardcoded admin credentials.
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { pool } from "../models/index";

const router = Router();

// ── Auth ────────────────────────────────────────────────────────────

const ADMIN_CREDENTIALS = { username: "admin", password: "preship2024!" };
const ADMIN_TOKEN =
  "preadmin_" +
  crypto
    .createHash("sha256")
    .update("preship-admin-2024")
    .digest("hex")
    .slice(0, 32);

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-admin-token"] as string;
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  next();
}

// ── Login ───────────────────────────────────────────────────────────

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    res.json({ success: true, data: { token: ADMIN_TOKEN } });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// ── Overview ────────────────────────────────────────────────────────

router.get("/overview", adminAuth, async (_req, res, next) => {
  try {
    const [
      totalRow,
      completedRow,
      failedRow,
      publicRow,
      apiRow,
      usersRow,
      projectsRow,
      avgRow,
      domainsRow,
      todayRow,
      todayPublicRow,
      weekRow,
      monthRow,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM scans"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE status = 'failed'"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE user_id IS NULL"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE user_id IS NOT NULL"),
      pool.query("SELECT COUNT(*) as count FROM users"),
      pool.query("SELECT COUNT(*) as count FROM projects"),
      pool.query("SELECT AVG(score) as avg FROM scans WHERE status = 'completed' AND score IS NOT NULL"),
      pool.query("SELECT COUNT(DISTINCT url) as count FROM scans"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE created_at >= CURRENT_DATE"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE created_at >= CURRENT_DATE AND user_id IS NULL"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE created_at >= NOW() - INTERVAL '7 days'"),
      pool.query("SELECT COUNT(*) as count FROM scans WHERE created_at >= date_trunc('month', CURRENT_DATE)"),
    ]);

    res.json({
      success: true,
      data: {
        totalScans: parseInt(totalRow.rows[0].count),
        completedScans: parseInt(completedRow.rows[0].count),
        failedScans: parseInt(failedRow.rows[0].count),
        publicScans: parseInt(publicRow.rows[0].count),
        apiScans: parseInt(apiRow.rows[0].count),
        totalUsers: parseInt(usersRow.rows[0].count),
        totalProjects: parseInt(projectsRow.rows[0].count),
        avgScore: avgRow.rows[0].avg ? Math.round(parseFloat(avgRow.rows[0].avg)) : 0,
        uniqueDomains: parseInt(domainsRow.rows[0].count),
        todayScans: parseInt(todayRow.rows[0].count),
        todayPublic: parseInt(todayPublicRow.rows[0].count),
        weekScans: parseInt(weekRow.rows[0].count),
        monthScans: parseInt(monthRow.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Daily scan counts ───────────────────────────────────────────────

router.get("/scans/daily", adminAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT date(created_at) as day,
             COUNT(*)::int as total,
             SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END)::int as organic,
             SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END)::int as internal,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed
      FROM scans
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date(created_at)
      ORDER BY day ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── Recent scans ────────────────────────────────────────────────────

router.get("/scans/recent", adminAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const result = await pool.query(
      `SELECT s.id, s.url, s.status, s.score, s.user_id, s.created_at, s.completed_at, s.error,
              u.email as user_email
       FROM scans s
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      data: result.rows.map((r) => ({
        id: r.id,
        url: r.url,
        status: r.status,
        score: r.score,
        source: r.user_id ? "api" : "organic",
        userEmail: r.user_email || null,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        error: r.error,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Top domains ─────────────────────────────────────────────────────

router.get("/domains", adminAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT url, COUNT(*)::int as scan_count,
             AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score,
             MAX(created_at) as last_scanned,
             SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END)::int as organic_count,
             SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END)::int as internal_count
      FROM scans
      GROUP BY url
      ORDER BY scan_count DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: result.rows.map((r) => ({
        url: r.url,
        scanCount: r.scan_count,
        avgScore: r.avg_score ? Math.round(parseFloat(r.avg_score)) : null,
        lastScanned: r.last_scanned,
        organicCount: r.organic_count,
        internalCount: r.internal_count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Score distribution ──────────────────────────────────────────────

router.get("/scores", adminAuth, async (_req, res, next) => {
  try {
    const distResult = await pool.query(`
      SELECT
        SUM(CASE WHEN score >= 90 THEN 1 ELSE 0 END)::int as excellent,
        SUM(CASE WHEN score >= 70 AND score < 90 THEN 1 ELSE 0 END)::int as good,
        SUM(CASE WHEN score >= 50 AND score < 70 THEN 1 ELSE 0 END)::int as needs_work,
        SUM(CASE WHEN score < 50 THEN 1 ELSE 0 END)::int as poor,
        COUNT(*)::int as total
      FROM scans WHERE status = 'completed' AND score IS NOT NULL
    `);

    // Category averages from JSONB results
    const catResult = await pool.query(`
      SELECT results FROM scans WHERE status = 'completed' AND results IS NOT NULL
    `);

    const catTotals: Record<string, { sum: number; count: number }> = {};
    for (const row of catResult.rows) {
      const results = typeof row.results === "string" ? JSON.parse(row.results) : row.results;
      if (results?.categories) {
        for (const cat of results.categories) {
          if (!catTotals[cat.category]) catTotals[cat.category] = { sum: 0, count: 0 };
          catTotals[cat.category].sum += cat.score;
          catTotals[cat.category].count += 1;
        }
      }
    }

    const categoryAverages = Object.entries(catTotals).map(([category, data]) => ({
      category,
      avgScore: Math.round(data.sum / data.count),
      scanCount: data.count,
    }));

    const dist = distResult.rows[0];
    res.json({
      success: true,
      data: {
        distribution: {
          excellent: dist.excellent || 0,
          good: dist.good || 0,
          needsWork: dist.needs_work || 0,
          poor: dist.poor || 0,
          total: dist.total || 0,
        },
        categoryAverages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Users ───────────────────────────────────────────────────────────

router.get("/users", adminAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.plan, u.created_at,
             (SELECT COUNT(*)::int FROM scans WHERE user_id = u.id) as scan_count,
             (SELECT COUNT(*)::int FROM projects WHERE user_id = u.id) as project_count
      FROM users u
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        plan: r.plan,
        createdAt: r.created_at,
        scanCount: r.scan_count,
        projectCount: r.project_count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
