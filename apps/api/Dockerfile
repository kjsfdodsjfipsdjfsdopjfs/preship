# ── Stage 1: Build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./

# Copy package manifests for dependency resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/scanner/package.json ./packages/scanner/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including devDependencies for building)
RUN npm ci --workspace=@preship/api --workspace=@preship/shared --workspace=@preship/scanner --include-workspace-root

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/scanner/ ./packages/scanner/
COPY apps/api/ ./apps/api/

# Build packages first, then the API
RUN npm run build -w @preship/shared && \
    npm run build -w @preship/scanner && \
    npm run build -w @preship/api

# ── Stage 2: Production ──────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk \
    dumb-init

# Puppeteer config — chromium-browser on Alpine, no sandbox needed in containers
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage"
ENV NODE_ENV=production

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/scanner/package.json ./packages/scanner/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --workspace=@preship/api --workspace=@preship/shared --workspace=@preship/scanner --include-workspace-root --omit=dev

# Copy built output from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/scanner/dist ./packages/scanner/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Create non-root user for security
RUN addgroup -g 1001 -S preship && \
    adduser -S preship -u 1001 -G preship

# Chromium needs a writable tmp dir for crash dumps and IPC
RUN mkdir -p /tmp/chromium && chown preship:preship /tmp/chromium

USER preship

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
