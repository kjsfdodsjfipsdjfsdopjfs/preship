#!/usr/bin/env npx tsx

/**
 * Batch Scanner for PreShip
 *
 * Reads URLs from scripts/scan-targets.csv, runs scans via the PreShip API,
 * polls for completion, and writes results to scripts/batch-results.json.
 *
 * Usage: npx tsx scripts/batch-scan.ts
 *
 * Options (env vars):
 *   PRESHIP_TOKEN    — Auth token (defaults to dev token)
 *   MAX_CONCURRENT   — Max concurrent scans (default 2)
 *   POLL_INTERVAL_MS — Poll interval in ms (default 5000)
 *   POLL_TIMEOUT_MS  — Max wait per scan in ms (default 120000)
 *   START_DELAY_MS   — Delay between scan starts in ms (default 3000)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "https://api.preship.dev";
const AUTH_TOKEN =
  process.env.PRESHIP_TOKEN ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NmFkNThjNi0zOTcxLTQ0MTQtYTY0ZS1mMTgyZTRiMjgwZjUiLCJlbWFpbCI6ImRldkBwcmVzaGlwLmRldiIsInBsYW4iOiJmcmVlIiwiaWF0IjoxNzczODM2NTIyLCJleHAiOjE3NzQ0NDEzMjJ9.LI-c96HePwCMiiu5AOyPWuo62uJkDjwjaNoVQXuBwW8";

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 2);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000);
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS ?? 120000);
const START_DELAY_MS = Number(process.env.START_DELAY_MS ?? 3000);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Target {
  url: string;
  name: string;
  category: string;
}

interface ScanResult {
  url: string;
  name: string;
  category: string;
  scanId: string | null;
  status: "completed" | "failed" | "timeout" | "error";
  data: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const scriptDir = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shortUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// ---------------------------------------------------------------------------
// CSV parser (no deps)
// ---------------------------------------------------------------------------

function parseCsv(raw: string): Target[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Skip header
  const header = lines[0].toLowerCase();
  const start = header.startsWith("url") ? 1 : 0;

  return lines.slice(start).map((line) => {
    const [url, name, ...rest] = line.split(",");
    const category = rest.join(",").trim();
    return { url: url.trim(), name: name.trim(), category };
  });
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function startScan(url: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/scans`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /api/scans failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  // Handle different response shapes — look for an id field
  const id =
    (json as any).id ??
    (json as any).scanId ??
    (json as any).data?.id ??
    (json as any).data?.scanId;

  if (!id) {
    throw new Error(
      `No scan id in response: ${JSON.stringify(json).slice(0, 200)}`
    );
  }

  return { id: String(id) };
}

async function pollScan(
  scanId: string,
  timeoutMs: number
): Promise<{ status: string; data: Record<string, unknown> | null }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/api/scans/${scanId}`, {
      headers: headers(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GET /api/scans/${scanId} failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    const scan = (json as any).data ?? json;
    const status = String(scan.status ?? "unknown").toLowerCase();

    if (status === "completed" || status === "complete" || status === "done") {
      return { status: "completed", data: scan };
    }

    if (status === "failed" || status === "error") {
      return { status: "failed", data: scan };
    }

    // Still in progress — wait and retry
    await sleep(POLL_INTERVAL_MS);
  }

  return { status: "timeout", data: null };
}

// ---------------------------------------------------------------------------
// Run a single scan end-to-end
// ---------------------------------------------------------------------------

async function runScan(target: Target, index: number, total: number): Promise<ScanResult> {
  const label = `${index + 1}/${total}: ${shortUrl(target.url)}`;
  log(`Scanning ${label}...`);

  const start = Date.now();
  let scanId: string | null = null;

  try {
    const { id } = await startScan(target.url);
    scanId = id;
    log(`  ${label} — scan started (id: ${id})`);

    const result = await pollScan(id, POLL_TIMEOUT_MS);
    const durationMs = Date.now() - start;

    if (result.status === "completed") {
      log(`  ${label} — completed in ${(durationMs / 1000).toFixed(1)}s`);
      return {
        ...target,
        scanId,
        status: "completed",
        data: result.data,
        error: null,
        durationMs,
      };
    }

    if (result.status === "timeout") {
      log(`  ${label} — timed out after ${(durationMs / 1000).toFixed(0)}s`);
      return {
        ...target,
        scanId,
        status: "timeout",
        data: null,
        error: `Timed out after ${POLL_TIMEOUT_MS / 1000}s`,
        durationMs,
      };
    }

    // failed
    log(`  ${label} — scan failed`);
    return {
      ...target,
      scanId,
      status: "failed",
      data: result.data,
      error: "Scan reported failure",
      durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    log(`  ${label} — error: ${msg}`);
    return {
      ...target,
      scanId,
      status: "error",
      data: null,
      error: msg,
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Concurrency-limited runner
// ---------------------------------------------------------------------------

async function runAll(targets: Target[]): Promise<ScanResult[]> {
  const results: ScanResult[] = new Array(targets.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const idx = nextIndex++;
      if (idx >= targets.length) return;

      // Stagger starts — delay before each scan (except the very first per worker)
      if (idx >= MAX_CONCURRENT) {
        await sleep(START_DELAY_MS);
      }

      results[idx] = await runScan(targets[idx], idx, targets.length);
      completed++;
    }
  }

  // Launch workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(MAX_CONCURRENT, targets.length); i++) {
    workers.push(worker());
    // Stagger the initial worker starts too
    if (i < MAX_CONCURRENT - 1) {
      await sleep(START_DELAY_MS);
    }
  }

  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const csvPath = resolve(scriptDir, "scan-targets.csv");
  const outPath = resolve(scriptDir, "batch-results.json");

  log("PreShip Batch Scanner");
  log(`Config: max_concurrent=${MAX_CONCURRENT}, poll_interval=${POLL_INTERVAL_MS}ms, timeout=${POLL_TIMEOUT_MS}ms, start_delay=${START_DELAY_MS}ms`);

  // Read targets
  let raw: string;
  try {
    raw = readFileSync(csvPath, "utf-8");
  } catch {
    console.error(`Could not read ${csvPath}`);
    process.exit(1);
  }

  const targets = parseCsv(raw);
  log(`Loaded ${targets.length} targets from ${csvPath}`);

  if (targets.length === 0) {
    console.error("No targets found in CSV.");
    process.exit(1);
  }

  // Print category breakdown
  const cats: Record<string, number> = {};
  for (const t of targets) {
    cats[t.category] = (cats[t.category] ?? 0) + 1;
  }
  for (const [cat, count] of Object.entries(cats)) {
    log(`  ${cat}: ${count}`);
  }

  log("");
  log("Starting scans...");
  log("");

  const startTime = Date.now();
  const results = await runAll(targets);
  const totalTime = Date.now() - startTime;

  // Write results
  const output = {
    meta: {
      scannedAt: new Date().toISOString(),
      totalTargets: targets.length,
      totalTimeMs: totalTime,
      config: {
        maxConcurrent: MAX_CONCURRENT,
        pollIntervalMs: POLL_INTERVAL_MS,
        pollTimeoutMs: POLL_TIMEOUT_MS,
        startDelayMs: START_DELAY_MS,
      },
    },
    summary: {
      completed: results.filter((r) => r.status === "completed").length,
      failed: results.filter((r) => r.status === "failed").length,
      timeout: results.filter((r) => r.status === "timeout").length,
      error: results.filter((r) => r.status === "error").length,
    },
    results,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  // Summary
  log("");
  log("=== BATCH SCAN COMPLETE ===");
  log(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
  log(`Completed: ${output.summary.completed}/${targets.length}`);
  log(`Failed:    ${output.summary.failed}`);
  log(`Timeout:   ${output.summary.timeout}`);
  log(`Error:     ${output.summary.error}`);
  log(`Results:   ${outPath}`);

  // Show failures
  const failures = results.filter((r) => r.status !== "completed");
  if (failures.length > 0) {
    log("");
    log("Failed scans:");
    for (const f of failures) {
      log(`  ${f.status.toUpperCase()} — ${f.name} (${f.url}): ${f.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
