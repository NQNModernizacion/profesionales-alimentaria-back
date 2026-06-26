---
name: secure-auth-checklist
description: Security checklist for auth and token handling before merging. Use when touching JWT, refresh, logout, guards, or identity queries.
---

# Secure auth checklist

## Before merge

- [ ] No passwords, refresh tokens, or raw JWTs in logs or error messages.
- [ ] Refresh path checks `type === 'refresh'` and rejects revoked JTIs before issuing new tokens.
- [ ] Generic client messages for failed login; no user enumeration via distinct errors.
- [ ] `INTERNAL_SECRET` / `JWT_*` only from configuration — not hardcoded.
- [ ] CORS and production settings unchanged unless explicitly requested.

## Commands

- `pnpm run lint`
- `pnpm run test:cov:auth` (if `src/auth/**` changed)
