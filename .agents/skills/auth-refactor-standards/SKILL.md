---
name: auth-refactor-standards
description: Refactors NestJS authentication safely by centralizing MySQL admin identity access and token revocation. Use when changing src/auth, login flows, JWT refresh, or identity repositories.
---

# Auth refactor standards

## When to apply

- Editing `src/auth/strategies/*`, `src/auth/services/*`, `src/auth/repositories/*`, or `AuthService`.

## Steps

1. **Identity**: load `users` / `Usuarios` / `Personas` only through `AdminIdentityRepository` / `AuthIdentityService` — not raw Drizzle in strategies.
2. **Revocation**: JTI blacklist only via `TokenRevocationRepository` (Redis), shared by logout and refresh rotation.
3. **Refresh**: `RefreshTokenService` owns verify + type check + revoke-old-JTI; strategies only extract the header and delegate.
4. **Secrets**: refresh signing secret from `ConfigService` / env — same as existing JWT module config.

## Verification

- `pnpm run test:cov:auth`
- `pnpm run build`

## Reject if

- Duplicated persona-fetch SQL appears in more than one strategy.
- Direct `redis.set('jti:...')` outside `RedisTokenRevocationRepository`.
