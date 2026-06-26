---
name: repo-pattern-enforcer
description: Enforces repository interfaces and symbol tokens for persistence in NestJS features. Use when adding Drizzle queries, Redis keys, or data access outside an existing repository.
---

# Repository pattern enforcer

## Rules

1. Define an **interface** (`*.repository.ts`) describing read/write operations for that bounded context.
2. Provide one **implementation** (e.g. `drizzle-*`, `redis-*`) registered with `useClass` and a `Symbol` token in the feature module.
3. **Inject** the interface token into services — not `DRIZZLE` / `REDIS_CLIENT` unless the class *is* the repository adapter.
4. **Tests**: mock the interface token, not Drizzle/Redis clients.

## Module registration example

- `{ provide: SOME_REPOSITORY, useClass: SomeDrizzleRepository }`

## Verification

- `pnpm test` for affected specs
- `pnpm run lint`
