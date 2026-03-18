import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

// ── Logger ───────────────────────────────────────────────────────────

function formatEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production") return;
    console.debug(formatEntry("debug", message, meta));
  },

  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatEntry("info", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatEntry("warn", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatEntry("error", message, meta));
  },
};

// ── Request ID ───────────────────────────────────────────────────────

export function generateRequestId(): string {
  return crypto.randomUUID();
}
