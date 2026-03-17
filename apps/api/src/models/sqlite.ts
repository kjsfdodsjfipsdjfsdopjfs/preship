/**
 * SQLite-based database layer for local development.
 * Drop-in replacement for the pg-based models/index.ts.
 *
 * Uses better-sqlite3 for synchronous, zero-dependency local storage.
 * DB file is stored at apps/api/data/preship.db
 */

import Database, { type Database as DatabaseType } from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Re-export the same types so consumers don't need to change imports
export type { User, Scan, Project, ApiKey } from "./index";
import type { User, Scan, Project, ApiKey } from "./index";

// ── Database Setup ────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "preship.db");
const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema Creation ──────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    checks TEXT, -- JSON array stored as text
    schedule TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    score REAL,
    results TEXT, -- JSON stored as text
    error TEXT,
    checks TEXT NOT NULL DEFAULT '[]', -- JSON array
    pages TEXT NOT NULL DEFAULT '[]',  -- JSON array
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL DEFAULT 'Default',
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL DEFAULT '',
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** Parse a SQLite row into a typed object, converting JSON text fields and dates */
function parseUser(row: any): User | null {
  if (!row) return null;
  return {
    ...row,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

function parseScan(row: any): Scan | null {
  if (!row) return null;
  return {
    ...row,
    score: row.score ?? null,
    results: row.results ? JSON.parse(row.results) : null,
    checks: row.checks ? JSON.parse(row.checks) : [],
    pages: row.pages ? JSON.parse(row.pages) : [],
    created_at: new Date(row.created_at),
    completed_at: row.completed_at ? new Date(row.completed_at) : null,
  };
}

function parseProject(row: any): Project | null {
  if (!row) return null;
  return {
    ...row,
    checks: row.checks ? JSON.parse(row.checks) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

function parseApiKey(row: any): ApiKey | null {
  if (!row) return null;
  return {
    ...row,
    last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
    created_at: new Date(row.created_at),
  };
}

// ── User Queries ────────────────────────────────────────────────────

export const userQueries = {
  async findById(id: string): Promise<User | null> {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return parseUser(row);
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    return parseUser(row);
  },

  async create(data: {
    email: string;
    password_hash: string;
    name: string;
  }): Promise<User> {
    const id = generateId();
    const ts = now();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.email, data.password_hash, data.name, ts, ts);
    return parseUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id))!;
  },

  async updatePlan(
    id: string,
    plan: string,
    stripeCustomerId?: string
  ): Promise<void> {
    const ts = now();
    if (stripeCustomerId) {
      db.prepare(
        "UPDATE users SET plan = ?, stripe_customer_id = ?, updated_at = ? WHERE id = ?"
      ).run(plan, stripeCustomerId, ts, id);
    } else {
      db.prepare(
        "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?"
      ).run(plan, ts, id);
    }
  },

  async findByStripeCustomerId(customerId: string): Promise<User | null> {
    const row = db
      .prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
      .get(customerId);
    return parseUser(row);
  },
};

// ── Scan Queries ────────────────────────────────────────────────────

export const scanQueries = {
  async create(data: {
    user_id: string;
    url: string;
    project_id?: string;
    checks: string[];
    pages: string[];
  }): Promise<Scan> {
    const id = generateId();
    const ts = now();
    db.prepare(
      `INSERT INTO scans (id, user_id, url, project_id, checks, pages, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)`
    ).run(
      id,
      data.user_id,
      data.url,
      data.project_id ?? null,
      JSON.stringify(data.checks),
      JSON.stringify(data.pages),
      ts
    );
    return parseScan(db.prepare("SELECT * FROM scans WHERE id = ?").get(id))!;
  },

  async findById(id: string): Promise<Scan | null> {
    const row = db.prepare("SELECT * FROM scans WHERE id = ?").get(id);
    return parseScan(row);
  },

  async findByUserId(
    userId: string,
    opts: {
      projectId?: string;
      limit: number;
      offset: number;
      sort: string;
    }
  ): Promise<{ scans: Scan[]; total: number }> {
    const orderCol = opts.sort === "score" ? "score" : "created_at";

    let whereClause = "WHERE user_id = ?";
    const params: unknown[] = [userId];

    if (opts.projectId) {
      params.push(opts.projectId);
      whereClause += " AND project_id = ?";
    }

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM scans ${whereClause}`)
      .get(...params) as { count: number };
    const total = countRow.count;

    params.push(opts.limit, opts.offset);
    const rows = db
      .prepare(
        `SELECT * FROM scans ${whereClause}
         ORDER BY ${orderCol} DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params);

    return {
      scans: rows.map((r: any) => parseScan(r)!),
      total,
    };
  },

  async updateStatus(
    id: string,
    status: string,
    data?: { score?: number; results?: Record<string, unknown>; error?: string }
  ): Promise<void> {
    const ts = now();
    if (status === "completed" && data) {
      db.prepare(
        `UPDATE scans SET status = ?, score = ?, results = ?, completed_at = ? WHERE id = ?`
      ).run(status, data.score ?? null, JSON.stringify(data.results), ts, id);
    } else if (status === "failed" && data?.error) {
      db.prepare(
        "UPDATE scans SET status = ?, error = ?, completed_at = ? WHERE id = ?"
      ).run(status, data.error, ts, id);
    } else {
      db.prepare("UPDATE scans SET status = ? WHERE id = ?").run(status, id);
    }
  },

  async getProjectHistory(
    projectId: string,
    userId: string
  ): Promise<Scan[]> {
    const rows = db
      .prepare(
        `SELECT * FROM scans
         WHERE project_id = ? AND user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all(projectId, userId);
    return rows.map((r: any) => parseScan(r)!);
  },
};

// ── Project Queries ─────────────────────────────────────────────────

export const projectQueries = {
  async create(data: {
    user_id: string;
    name: string;
    url: string;
    checks?: string[];
    schedule?: string;
  }): Promise<Project> {
    const id = generateId();
    const ts = now();
    db.prepare(
      `INSERT INTO projects (id, user_id, name, url, checks, schedule, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.user_id,
      data.name,
      data.url,
      data.checks ? JSON.stringify(data.checks) : null,
      data.schedule ?? null,
      ts,
      ts
    );
    return parseProject(
      db.prepare("SELECT * FROM projects WHERE id = ?").get(id)
    )!;
  },

  async findById(id: string, userId: string): Promise<Project | null> {
    const row = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
      .get(id, userId);
    return parseProject(row);
  },

  async findByUserId(
    userId: string,
    opts: { limit: number; offset: number }
  ): Promise<{ projects: Project[]; total: number }> {
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?")
      .get(userId) as { count: number };
    const total = countRow.count;

    const rows = db
      .prepare(
        `SELECT * FROM projects WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(userId, opts.limit, opts.offset);

    return {
      projects: rows.map((r: any) => parseProject(r)!),
      total,
    };
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Pick<Project, "name" | "url" | "checks" | "schedule">>
  ): Promise<Project | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      setClauses.push("name = ?");
      params.push(data.name);
    }
    if (data.url !== undefined) {
      setClauses.push("url = ?");
      params.push(data.url);
    }
    if (data.checks !== undefined) {
      setClauses.push("checks = ?");
      params.push(data.checks ? JSON.stringify(data.checks) : null);
    }
    if (data.schedule !== undefined) {
      setClauses.push("schedule = ?");
      params.push(data.schedule);
    }

    if (setClauses.length === 0) return this.findById(id, userId);

    const ts = now();
    setClauses.push("updated_at = ?");
    params.push(ts, id, userId);

    db.prepare(
      `UPDATE projects SET ${setClauses.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...params);

    return this.findById(id, userId);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = db
      .prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return result.changes > 0;
  },
};

// ── API Key Queries ─────────────────────────────────────────────────

export const apiKeyQueries = {
  async create(data: {
    user_id: string;
    key_hash: string;
    name: string;
    prefix: string;
  }): Promise<ApiKey> {
    const id = generateId();
    const ts = now();
    db.prepare(
      `INSERT INTO api_keys (id, user_id, key_hash, name, prefix, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.user_id, data.key_hash, data.name, data.prefix, ts);
    return parseApiKey(
      db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id)
    )!;
  },

  async findByHash(
    keyHash: string
  ): Promise<{ id: string; user: User } | null> {
    const row = db
      .prepare(
        `SELECT ak.*, u.plan as user_plan, u.name as user_name, u.email as user_email
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = ?`
      )
      .get(keyHash) as any;

    if (!row) return null;

    return {
      id: row.id,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        plan: row.user_plan as User["plan"],
        password_hash: "",
        stripe_customer_id: null,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.created_at),
      },
    };
  },

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const rows = db
      .prepare(
        "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
      )
      .all(userId);
    return rows.map((r: any) => parseApiKey(r)!);
  },

  async updateLastUsed(id: string): Promise<void> {
    db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(
      now(),
      id
    );
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = db
      .prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?")
      .run(id, userId);
    return result.changes > 0;
  },
};

// ── Usage Queries ───────────────────────────────────────────────────

export const usageQueries = {
  async getMonthlyUsage(userId: string): Promise<number> {
    // Get the first day of the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const row = db
      .prepare(
        `SELECT COUNT(*) as count FROM scans
         WHERE user_id = ?
           AND created_at >= ?
           AND status != 'failed'`
      )
      .get(userId, monthStart) as { count: number };
    return row.count;
  },

  async incrementUsage(_userId: string): Promise<void> {
    // Usage is tracked via scan records; this is a no-op placeholder.
  },
};

// ── Export the raw db for use by local.ts seed logic ────────────────

export { db };
