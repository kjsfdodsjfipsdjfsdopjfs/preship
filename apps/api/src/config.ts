import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.API_PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://localhost:5432/preship",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Auth
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
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
  apiKeySalt: process.env.API_KEY_SALT || "dev-salt-change-me",

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
