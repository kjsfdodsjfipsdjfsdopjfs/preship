#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[ok]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[!!]${NC}  $1"; }
fail()  { echo -e "${RED}[err]${NC} $1"; exit 1; }

echo ""
echo "========================================="
echo "  PreShip - Development Setup"
echo "========================================="
echo ""

# ── Prerequisites ────────────────────────────────────────────────────

echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node.js 18+ from https://nodejs.org"
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18+ is required (found v$(node -v))"
fi
info "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fail "npm is not installed."
info "npm $(npm -v)"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker from https://docker.com"
info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# Check if Docker daemon is running
docker info >/dev/null 2>&1 || fail "Docker daemon is not running. Start Docker Desktop and try again."
info "Docker daemon running"

echo ""

# ── Environment File ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    info "Created .env from .env.example"
    warn "Review .env and update secrets before deploying to production"
  else
    fail ".env.example not found"
  fi
else
  info ".env already exists"
fi

echo ""

# ── Install Dependencies ─────────────────────────────────────────────

echo "Installing dependencies..."
npm install
info "Dependencies installed"
echo ""

# ── Start Docker Containers ──────────────────────────────────────────

echo "Starting PostgreSQL and Redis..."
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be ready..."
RETRIES=30
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U preship >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    fail "PostgreSQL did not become ready in time"
  fi
  sleep 1
done
info "PostgreSQL is ready"

until docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    fail "Redis did not become ready in time"
  fi
  sleep 1
done
info "Redis is ready"

echo ""

# ── Run Migrations ───────────────────────────────────────────────────

echo "Running database migrations..."
npx tsx scripts/migrate.ts
info "Migrations complete"
echo ""

# ── Seed Database ────────────────────────────────────────────────────

echo "Seeding database..."
npx tsx scripts/seed.ts
info "Database seeded"
echo ""

# ── Done ─────────────────────────────────────────────────────────────

echo "========================================="
echo -e "  ${GREEN}Setup complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the API:    npm run dev:api"
echo "  2. Start the web:    npm run dev:web"
echo ""
echo "  API:  http://localhost:3001"
echo "  Web:  http://localhost:3000"
echo ""
echo "  Test login: test@preship.dev / password123"
echo ""
