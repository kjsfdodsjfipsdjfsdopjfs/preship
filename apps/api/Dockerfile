# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./

# Copy package manifests for dependency resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/scanner/package.json ./packages/scanner/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/scanner/ ./packages/scanner/
COPY apps/api/ ./apps/api/

# Build packages first, then the API
RUN npm run build -w @preship/shared && \
    npm run build -w @preship/scanner && \
    npm run build -w @preship/api

# ── Stage 2: Production ──────────────────────────────────────────────
FROM node:20-slim AS runner

# Install Chromium and dependencies for Debian/slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer config — use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/scanner/package.json ./packages/scanner/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/scanner/dist ./packages/scanner/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy SQL migration files (not emitted by tsc)
COPY --from=builder /app/apps/api/src/migrations ./apps/api/dist/migrations

# Create non-root user for security
RUN groupadd -r preship && useradd -r -g preship -m preship

# Chromium needs writable dirs
RUN mkdir -p /tmp/chromium && chown preship:preship /tmp/chromium

USER preship

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
