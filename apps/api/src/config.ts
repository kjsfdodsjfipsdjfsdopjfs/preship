import dotenv from "dotenv";

dotenv.config();

const INSECURE_JWT_SECRET = "dev-secret-change-me";
const INSECURE_API_KEY_SALT = "dev-salt-change-me";

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || INSECURE_JWT_SECRET;
const apiKeySalt = process.env.API_KEY_SALT || INSECURE_API_KEY_SALT;

if (nodeEnv === "production") {
  if (jwtSecret === INSECURE_JWT_SECRET) {
    throw new Error(
      "FATAL: JWT_SECRET must be set to a secure value in production. " +
        "Do not use the default development secret."
    );
  }
  if (apiKeySalt === INSECURE_API_KEY_SALT) {
    throw new Error(
      "FATAL: API_KEY_SALT must be set to a secure value in production. " +
        "Do not use the default development salt."
    );
  }
}

export const config = {
  port: parseInt(process.env.API_PORT || "3001", 10),
  nodeEnv,

  // Database
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://localhost:5432/preship",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Auth
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || "",

  // URLs
  apiUrl: process.env.API_URL || "http://localhost:3001",
  webUrl: process.env.WEB_URL || "http://localhost:3000",

  // API Key
  apiKeySalt,

  // Scanning
  scanTimeout: parseInt(process.env.SCAN_TIMEOUT || "60000", 10),
  maxPages: parseInt(process.env.MAX_PAGES || "50", 10),

  // Rate limiting
  rateLimitWindowMs: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "60000",
    10
  ),
  rateLimitMaxRequests: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100",
    10
  ),
} as const;
