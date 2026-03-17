import pg from "pg";
import { config } from "../config";

// ── Database Pool ───────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export { pool };

// ── Types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: "free" | "pro" | "team" | "enterprise";
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Scan {
  id: string;
  user_id: string;
  project_id: string | null;
  url: string;
  status: string;
  score: number | null;
  results: Record<string, unknown> | null;
  error: string | null;
  checks: string[];
  pages: string[];
  created_at: Date;
  completed_at: Date | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  url: string;
  checks: string[] | null;
  schedule: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  prefix: string;
  last_used_at: Date | null;
  created_at: Date;
}

// ── User Queries ────────────────────────────────────────────────────

export const userQueries = {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return rows[0] ?? null;
  },

  async create(data: {
    email: string;
    password_hash: string;
    name: string;
  }): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.email, data.password_hash, data.name]
    );
    return rows[0];
  },

  async updatePlan(
    id: string,
    plan: string,
    stripeCustomerId?: string
  ): Promise<void> {
    if (stripeCustomerId) {
      await pool.query(
        "UPDATE users SET plan = $1, stripe_customer_id = $2, updated_at = NOW() WHERE id = $3",
        [plan, stripeCustomerId, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2",
        [plan, id]
      );
    }
  },

  async findByStripeCustomerId(customerId: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      "SELECT * FROM users WHERE stripe_customer_id = $1",
      [customerId]
    );
    return rows[0] ?? null;
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
    const { rows } = await pool.query<Scan>(
      `INSERT INTO scans (user_id, url, project_id, checks, pages, status)
       VALUES ($1, $2, $3, $4, $5, 'queued')
       RETURNING *`,
      [
        data.user_id,
        data.url,
        data.project_id ?? null,
        data.checks,
        data.pages,
      ]
    );
    return rows[0];
  },

  async findById(id: string): Promise<Scan | null> {
    const { rows } = await pool.query<Scan>(
      "SELECT * FROM scans WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
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

    let whereClause = "WHERE user_id = $1";
    const params: unknown[] = [userId];

    if (opts.projectId) {
      params.push(opts.projectId);
      whereClause += ` AND project_id = $${params.length}`;
    }

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM scans ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(opts.limit, opts.offset);
    const { rows } = await pool.query<Scan>(
      `SELECT * FROM scans ${whereClause}
       ORDER BY ${orderCol} DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { scans: rows, total };
  },

  async updateStatus(
    id: string,
    status: string,
    data?: { score?: number; results?: Record<string, unknown>; error?: string }
  ): Promise<void> {
    if (status === "completed" && data) {
      await pool.query(
        `UPDATE scans
         SET status = $1, score = $2, results = $3, completed_at = NOW()
         WHERE id = $4`,
        [status, data.score ?? null, JSON.stringify(data.results), id]
      );
    } else if (status === "failed" && data?.error) {
      await pool.query(
        `UPDATE scans SET status = $1, error = $2, completed_at = NOW() WHERE id = $3`,
        [status, data.error, id]
      );
    } else {
      await pool.query("UPDATE scans SET status = $1 WHERE id = $2", [
        status,
        id,
      ]);
    }
  },

  async getProjectHistory(
    projectId: string,
    userId: string
  ): Promise<Scan[]> {
    const { rows } = await pool.query<Scan>(
      `SELECT * FROM scans
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [projectId, userId]
    );
    return rows;
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
    const { rows } = await pool.query<Project>(
      `INSERT INTO projects (user_id, name, url, checks, schedule)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.user_id,
        data.name,
        data.url,
        data.checks ?? null,
        data.schedule ?? null,
      ]
    );
    return rows[0];
  },

  async findById(id: string, userId: string): Promise<Project | null> {
    const { rows } = await pool.query<Project>(
      "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return rows[0] ?? null;
  },

  async findByUserId(
    userId: string,
    opts: { limit: number; offset: number }
  ): Promise<{ projects: Project[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM projects WHERE user_id = $1",
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query<Project>(
      `SELECT * FROM projects WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, opts.limit, opts.offset]
    );

    return { projects: rows, total };
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Pick<Project, "name" | "url" | "checks" | "schedule">>
  ): Promise<Project | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.url !== undefined) {
      setClauses.push(`url = $${paramIndex++}`);
      params.push(data.url);
    }
    if (data.checks !== undefined) {
      setClauses.push(`checks = $${paramIndex++}`);
      params.push(data.checks);
    }
    if (data.schedule !== undefined) {
      setClauses.push(`schedule = $${paramIndex++}`);
      params.push(data.schedule);
    }

    if (setClauses.length === 0) return this.findById(id, userId);

    setClauses.push(`updated_at = NOW()`);
    params.push(id, userId);

    const { rows } = await pool.query<Project>(
      `UPDATE projects SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      "DELETE FROM projects WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
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
    const { rows } = await pool.query<ApiKey>(
      `INSERT INTO api_keys (user_id, key_hash, name, prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.key_hash, data.name, data.prefix]
    );
    return rows[0];
  },

  async findByHash(
    keyHash: string
  ): Promise<{ id: string; user: User } | null> {
    const { rows } = await pool.query<ApiKey & { user_plan: string; user_name: string; user_email: string }>(
      `SELECT ak.*, u.plan as user_plan, u.name as user_name, u.email as user_email
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
      [keyHash]
    );
    if (!rows[0]) return null;

    const row = rows[0];
    return {
      id: row.id,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        plan: row.user_plan as User["plan"],
        password_hash: "",
        stripe_customer_id: null,
        created_at: row.created_at,
        updated_at: row.created_at,
      },
    };
  },

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const { rows } = await pool.query<ApiKey>(
      "SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return rows;
  },

  async updateLastUsed(id: string): Promise<void> {
    await pool.query(
      "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
      [id]
    );
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      "DELETE FROM api_keys WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  },
};

// ── Usage Queries ───────────────────────────────────────────────────

export const usageQueries = {
  async getMonthlyUsage(userId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM scans
       WHERE user_id = $1
         AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
         AND status != 'failed'`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  },

  async incrementUsage(userId: string): Promise<void> {
    // Usage is tracked via scan records; this is a no-op placeholder.
    // The getMonthlyUsage query counts scans directly.
  },
};
