# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nexora** is a real-time community platform (Discord-like). It is a Turborepo monorepo with:
- `apps/api` — Fastify 5 backend (TypeScript, ESM)
- `apps/web` — Next.js 15 frontend (React 18, TypeScript)
- `packages/schemas` — Shared Zod validation schemas (`@nexora/schemas`)
- `packages/types` — Shared TypeScript types (`@nexora/types`)
- `packages/ui` — Shared React UI components (`@nexora/ui`)
- `packages/config` — Shared ESLint/TSConfig configs

## Commands

Run from the **repo root** unless noted:

```bash
npm run dev           # Start all apps (API on :3001, web on :3000)
npm run build         # Build all apps
npm run lint          # Lint all apps
npm run typecheck     # Type-check all apps
npm run test          # Run tests (Vitest, API only currently)
npm run format        # Format all code (Prettier)
npm run format:check  # Check formatting without writing
```

From `apps/api`:
```bash
npm run test:watch    # Vitest in watch mode
npm run db:generate   # Generate Drizzle migration files
npm run db:push       # Push schema directly to DB (dev)
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```

## Architecture

### Backend (`apps/api`)

Fastify 5 with ESM. Entry point: `src/index.ts` registers all route modules and starts the server.

**Key directories:**
- `src/routes/` — One file per resource (auth, users, hubs, channels, messages, dms, invites, roles, voice, moderation, uploads, social)
- `src/db/schema/` — Drizzle ORM schema files (users, hubs, channels, messages, moderation, social)
- `src/lib/` — `env.ts` (Zod-validated env), `jwt.ts`, `redis.ts`, `socket.ts` (Socket.io setup), `errors.ts`
- `src/middleware/` — `auth.ts` (JWT `requireAuth`), `error-handler.ts`

**Auth flow:** JWT access token (short-lived) + refresh token (long-lived, httpOnly cookie). Access token passed in `Authorization: Bearer` header. `requireAuth` middleware verifies and attaches `request.user`.

**Database:** PostgreSQL + Drizzle ORM. Key tables: `users`, `hubs`, `hubMembers`, `zones`, `channels`, `messages`, `reactions`, `roles`, `memberRoles`, `invites`, `bans`, `mutes`, `friendships`, `blocks`.

**Real-time:** Socket.io with Redis adapter (gracefully degrades to in-memory). Rooms per channel/DM for message broadcasting. Presence tracked in Redis with 30s TTL heartbeats. Voice participants tracked per voice channel.

**Rate limiting:** 200 req/min globally, per `userId` if authenticated otherwise per IP.

### Frontend (`apps/web`)

Next.js 15 App Router. Entry: `src/app/layout.tsx` wraps everything in `QueryProvider` and `ThemeProvider`.

**Route groups:**
- `(auth)/` — Login, register, verify-email, reset-password (unauthenticated)
- `app/` — Protected routes: `discover/`, `dms/`, `hub/[hubId]/`
- `invite/[inviteCode]` — Public invite redemption page

**State management:**
- Zustand stores in `src/store/`: `auth.ts` (token, user), `hub.ts` (active hub/channel/zone, voice participants), `messages.ts`, `notifications.ts`, others
- TanStack React Query for server data (HTTP GET requests, cache invalidation on mutations)

**Real-time:** `src/hooks/use-socket.ts` maintains a global Socket.io singleton connected after auth. `use-hub-socket.ts` subscribes to hub-specific events. `use-channel-messages.ts` handles message streaming.

**Voice/Video:** `src/hooks/use-webrtc.ts` manages WebRTC peer connections. LiveKit token fetched from API, then client connects to LiveKit room.

### Shared Packages

`@nexora/schemas` — Zod schemas used for form validation on web AND request validation on API. Changes here affect both ends.

`@nexora/types` — TypeScript interfaces. Import from here rather than redefining types locally.

`@nexora/ui` — Headless/styled primitives (Button, Input, Avatar, Badge, Spinner, Skeleton) built on Radix UI + Tailwind CVA.

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env`. Minimum required vars:

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<32-byte hex>
JWT_REFRESH_SECRET=<32-byte hex>
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Redis, LiveKit, SMTP, and S3 are optional — the app degrades gracefully without them.

Frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`).

## Key Conventions

- **API routes** are prefixed `/api/<resource>` (e.g., `/api/hubs`, `/api/messages`).
- **Error responses** use the centralized format `{ statusCode, code, message }` — add new errors to `src/lib/errors.ts`.
- **Permissions** are stored as a bitmask on roles; channel-level overrides are in `channelPermissionOverrides`.
- **Atmospheres** (`studio`, `arcade`, `lounge`, `guild`, `orbit`) drive hub UI theming.
- **Join policies** (open, invite_only, email_confirmed, etc.) are enforced in `routes/invites.ts` and `routes/hubs.ts`.
- All schema changes require running `npm run db:generate` then `npm run db:migrate`.
