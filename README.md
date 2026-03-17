# PreShip

API-first accessibility, security, and performance scanning platform for vibe-coded apps.

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Build shared packages first
npm run build:packages

# Start the API server
npm run dev:api

# Start the web dashboard (separate terminal)
npm run dev:web
```

## Project Structure

- `apps/api` - Express backend API
- `apps/web` - Next.js dashboard and landing page
- `apps/docs` - API documentation
- `packages/scanner` - Core scanning engine
- `packages/shared` - Shared types, constants, utilities
- `packages/cli` - CLI tool (`npx preship`)
