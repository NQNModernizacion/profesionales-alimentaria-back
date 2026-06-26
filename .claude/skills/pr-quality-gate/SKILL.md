---
name: pr-quality-gate
description: Pre-PR quality gate for this repo (lint, tests, auth coverage, build, audit). Use before opening a PR or when the user asks for a CI-ready change.
---

# PR quality gate

## Run locally

```bash
pnpm run test:ci
```

Equivalent steps:

1. `pnpm run lint`
2. `pnpm test`
3. `pnpm run test:cov:auth`
4. `pnpm run build`
5. `pnpm audit --audit-level=critical`

## Definition of done

- Build passes; no new ESLint errors.
- Tests green; auth changes satisfy `test:cov:auth` thresholds (`jest.auth.config.cjs`).
- No unintended edits to `.env` or secrets in code.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` mirrors this gate on push/PR.
