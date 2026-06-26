# Agent instructions

> **Template NestJS.** Este repositorio es una plantilla con identidad dual (MySQL `admin` + PostgreSQL), Redis, JWT y Docker. Cuando lo forks, correr `pnpm tsx initTemplate.ts` una sola vez para personalizar nombre, slug, docker-compose y `.env*`; el script se autoelimina al terminar.

See [CLAUDE.md](CLAUDE.md) for architecture and commands, and [DOCS.md](DOCS.md) for the full design.

## Quality gates (strict)

Before considering work complete, run:

```bash
pnpm run test:ci
```

This runs lint, unit tests, auth coverage thresholds, production build, and critical-level dependency audit.

## Cursor rules

Project rules live in `.cursor/rules/` (architecture, DRY/KISS/SOLID, security, testing, repositories).

## Agent skills

Workflow skills live under `.agents/skills/` (auth refactor, repository pattern, secure auth checklist, PR gate).
