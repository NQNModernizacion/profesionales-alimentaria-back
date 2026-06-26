# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Este repo es un template NestJS.** Ejecuta `pnpm tsx initTemplate.ts` después de hacer fork para personalizar nombre, slug, docker-compose y `.env*`. El script se autoelimina al terminar.

## Commands

```bash
# Development
pnpm start:dev          # Watch mode (local)
pnpm build              # Compile TypeScript

# Testing
pnpm test               # Run unit tests (Jest)
pnpm test:watch         # Watch mode
pnpm test:e2e           # End-to-end tests
pnpm test:cov           # Coverage report
pnpm test:cov:auth      # Auth-focused coverage gate (see jest.auth.config.cjs)
pnpm test:ci            # Strict CI gate: lint + test + auth coverage + build + audit (critical)

# Run a single test file
pnpm test -- --testPathPatterns=auth

# Database (Drizzle)
pnpm db:generate        # Generate migration from schema changes
pnpm db:migrate         # Apply migrations to PostgreSQL
pnpm db:studio          # Open Drizzle Studio

# Docker
pnpm docker:dev         # Dev stack (app + postgres + redis) with hot reload
pnpm docker:up          # Production stack
pnpm docker:test        # Run tests inside Docker
pnpm docker:logs        # Tail app logs

# Lint / format
pnpm lint               # ESLint with auto-fix
pnpm format             # Prettier
```

## Architecture

### Dual-database identity model

Identity lives **exclusively in MySQL `admin`** (external DB, read-only from this app). PostgreSQL is the app database for business logic and authorization. **There is no `users` table in PostgreSQL.**

- `ADMIN_DATABASE_URL` → MySQL — tables: `users` (credentials), `Usuarios` (pivot), `Personas` (personal data)
- `DATABASE_URL` → PostgreSQL — business data, roles/permissions (via library), audit

The JWT `sub` claim is always `admin.users.id` (bigint). Roles are resolved from PostgreSQL using a library (CASL is installed; Casbin or `nest-access-control` are compatible alternatives), never duplicated from MySQL.

Login by email: directly queries `users`. Login by document (`internal` strategy): `Personas` → `Usuarios` → `users`.

### Module structure (actual, not aspirational)

```
src/
├── app.module.ts           # Root module
├── main.ts                 # Bootstrap: CORS, uploads, Swagger (non-prod)
├── app.controller.ts       # Placeholder — replace with your own
├── app.service.ts          # Placeholder
├── auth/                   # Login strategies, JWT issuance, /auth/* endpoints
├── admin-db/               # Drizzle MySQL `admin` client (DRIZZLE_ADMIN token)
├── admin-panel/            # Role/permission assignment on admin.users.id
├── db/                     # Drizzle PostgreSQL client (DRIZZLE token) + migrations
├── redis/                  # RedisService (INCR, SADD, Pub/Sub, rate limit)
└── interceptors/           # Cross-cutting interceptors
```

New features should add a sibling directory with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` and register in `app.module.ts`.

### Drizzle client injection

PostgreSQL client is provided under the `DRIZZLE` symbol token. MySQL admin client uses `DRIZZLE_ADMIN`. Inject with `@Inject(DRIZZLE)` / `@Inject(DRIZZLE_ADMIN)`.

The PostgreSQL client is created with `casing: 'snake_case'` — Drizzle maps camelCase schema fields to snake_case columns automatically.

### Auth flow summary

- Login validates credentials against MySQL `admin` and issues JWT signed with `JWT_SECRET` locally.
- `JwtStrategy.validate` extracts `sub` (bigint = `admin.users.id`) and loads roles/permissions from PostgreSQL.
- Refresh rotates tokens; logout revokes when a revocation list is used.
- `JWT_LIFETIME_PROFILE` switches between `default` (use `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`), `extended` (24h / 90d) and `infinite` (100y) — infinite is dev-only.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_DATABASE_URL` | MySQL `admin` connection string |
| `REDIS_URL` | Redis connection |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Access TTL when profile is `default` (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh TTL when profile is `default` (e.g. `7d`) |
| `JWT_LIFETIME_PROFILE` | `default` \| `extended` \| `infinite` — switches both TTLs at once. `default` respects the variables above. `extended` uses fixed long TTLs (`24h` / `90d`). `infinite` uses `100y` in both (practically no expiration). **Do not use `extended`/`infinite` in public production without risk review.** |
| `ADMIN_JWT_SECRET` / `ADMIN_JWT_ALGORITHM` | Shared secret / algorithm for tokens coming from external admin systems (if applicable) |
| `ADMIN_API_URL` | URL of the external admin API (if consumed) |
| `API_BASE_URL` | Base URL for absolute asset URLs (`/uploads/…` → `{API_BASE_URL}/uploads/…`) |
| `BOOTSTRAP_ADMIN_EMAIL` | Email in `admin.users` that gets `admin` role on first boot |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | Redis-backed rate limit defaults |
| `FLUSH_INTERVAL_MS` / `FLUSH_BATCH_SIZE` | Optional batching knobs for Redis→Postgres flush in write-heavy features |

Local dev uses `.env`; Docker uses `.env.docker`; test Docker uses `.env.test.docker`.

## CI / definition of done

- Prefer **`pnpm test:ci`** before merging: ESLint, unit tests, **auth coverage thresholds** (`jest.auth.config.cjs`), `nest build`, and `pnpm audit --audit-level=critical`.
- GitHub Actions: `.github/workflows/ci.yml` runs the same steps on push/PR to `main`/`master`.
- Project AI rules: `.cursor/rules/`; workflow skills: `.agents/skills/`.

## Key decisions (see DOCS.md for full rationale)

- **No `users` table in PostgreSQL** — identity stays in MySQL `admin`.
- **Roles/permissions via library** (CASL is the default wired; Casbin / nest-access-control are compatible) persisted in PostgreSQL — not a `role` column on a user row.
- **Redis** is the source of truth for hot counters / uniqueness; PostgreSQL is the durable store.
- **Two Drizzle clients** with distinct injection tokens; never merge them.

<!-- The following rules are extracted from user-supplied rules files -->
<!-- Generated by cursor-rules-to-claude v1.0.0 -->

<!-- Auto attached rules -->

# Architecture Boundaries

>Layering and dependency direction for NestJS modules
This rule can be found [here](.cursor/rules/architecture-boundaries.md)

# Architecture boundaries

- **Controllers**: HTTP mapping, validation pipes, DTOs. No SQL/Redis/JWT crypto.
- **Services**: orchestrate use cases; depend on repository interfaces or domain services.
- **Repositories**: isolate persistence (Drizzle/Redis). No Nest HTTP types.
- **Strategies/guards**: thin; delegate identity and token rules to injectable services.
- **Cross-module imports**: prefer feature modules exporting facades; avoid deep imports across features.
- **Identity**: MySQL `admin` read-only via repositories; PostgreSQL app DB for roles/votes — never merge identity tables into Postgres `users`.

<!-- The following rules can be requested by agent by reading the filepath directly. -->

# Data Access Patterns

>Repository pattern and data access
This refers to: "**/repositories/**/*.ts,**/*.repository.ts"

Read the full rule [here](.cursor/rules/data-access-patterns.md)

# Dry Kiss Solid

>DRY, KISS, SOLID checklist before merging changes
This refers to: src/**/*.ts

Read the full rule [here](.cursor/rules/dry-kiss-solid.md)

# Error Handling Observability

>Exceptions and logging expectations
This refers to: src/**/*.ts

Read the full rule [here](.cursor/rules/error-handling-observability.md)

# Performance Reliability

>Performance and reliability for backend handlers
This refers to: src/**/*.ts

Read the full rule [here](.cursor/rules/performance-reliability.md)

# Security Auth

>Security rules for authentication and tokens
This refers to: src/auth/**/*.ts

Read the full rule [here](.cursor/rules/security-auth.md)

# Testing Standards

>Unit and integration test conventions
This refers to: "**/*.spec.ts,test/**/*.ts"

Read the full rule [here](.cursor/rules/testing-standards.md)

# Typescript Backend Quality

>TypeScript quality for NestJS backend code
This refers to: src/**/*.ts

Read the full rule [here](.cursor/rules/typescript-backend-quality.md)
