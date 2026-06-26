# Nest Template

> Template backend NestJS listo para producción con identidad dual (MySQL `admin` + PostgreSQL), Redis, JWT, Docker y un pipeline de quality gate estricto.

Este repositorio es una **plantilla reutilizable**. Trae el stack listo, las convenciones, las reglas para agentes de IA (`.cursor/rules/`, `.agents/skills/`) y un script de inicialización que ajusta nombres/envs/docker cuando haces un fork.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | NestJS 11 (Express) |
| Lenguaje | TypeScript 5 |
| ORM | Drizzle ORM |
| Base de datos de negocio | PostgreSQL |
| Base de datos de identidad (read-only) | MySQL `admin` |
| Cache / rate limit / pub-sub | Redis |
| Auth | Passport JWT (`@nestjs/jwt`, `passport-jwt`) + bcryptjs |
| Autorización | CASL (`@casl/ability`) — ganchos listos para ampliar |
| Docs API | Swagger (`@nestjs/swagger`) |
| Testing | Jest (unit + e2e) + cobertura dedicada de `auth` |
| CI local | `pnpm test:ci` (lint + test + auth coverage + build + audit) |
| Contenedores | Docker + Docker Compose (base / dev / test) |

## Usar este template

1. Haz fork o clona el repositorio.
2. Instala dependencias:

   ```bash
   pnpm install
   ```

3. Ejecuta el script de inicialización:

   ```bash
   pnpm tsx initTemplate.ts
   ```

   Te pedirá:
   - Nombre humano de la app (p. ej. `Mi Backend API`).
   - Slug en kebab-case (p. ej. `mi-backend-api`).
   - Descripción (opcional).

   El script actualiza `package.json`, `src/main.ts` (Swagger), `docker-compose*.yml`, `.env*`, la colección de Postman y la documentación. Al terminar, se autoelimina junto con `configApp.ts` legacy.

## Requisitos

- Node.js 22+
- pnpm 9+ (`corepack enable`)
- Docker Desktop (opcional pero recomendado)
- Acceso a una BD MySQL con el esquema `admin` (credenciales/personas) si vas a usar el flujo de login real

## Quick start local

```bash
pnpm install
cp .env.example .env         # Linux/Mac
Copy-Item .env.example .env  # PowerShell
pnpm db:migrate
pnpm start:dev
```

La app queda en `http://localhost:3000`. Swagger en `http://localhost:3000/api-docs` (solo en `NODE_ENV !== production`).

## Docker

### 1) Preparar archivos de entorno

```bash
# Linux/Mac
cp .env.docker.example .env.docker
cp .env.test.docker.example .env.test.docker
```

```powershell
# Windows PowerShell
Copy-Item .env.docker.example .env.docker
Copy-Item .env.test.docker.example .env.test.docker
```

### 2) Stack productivo (app + PostgreSQL + Redis)

```bash
pnpm docker:up
```

- App: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Detener: `pnpm docker:down` · Logs: `pnpm docker:logs`.

### 3) Stack de desarrollo con watch mode

```bash
pnpm docker:dev
```

Detener: `pnpm docker:dev:down`.

### 4) Stack de tests (Postgres + Redis aislados)

```bash
pnpm docker:test
```

- Postgres de test: `localhost:5433`
- Redis de test: `localhost:6380`

## Scripts útiles

| Comando | Uso |
|---|---|
| `pnpm start:dev` | Watch mode local |
| `pnpm build` | Compila TypeScript |
| `pnpm test` | Unit tests (Jest) |
| `pnpm test:e2e` | End-to-end |
| `pnpm test:cov` | Cobertura global |
| `pnpm test:cov:auth` | Cobertura con umbrales estrictos para `auth/` |
| `pnpm test:ci` | Quality gate: lint + test + auth cov + build + audit |
| `pnpm db:generate` | Generar migración Drizzle |
| `pnpm db:migrate` | Aplicar migraciones a PostgreSQL |
| `pnpm db:studio` | Abrir Drizzle Studio |
| `pnpm lint` / `pnpm format` | ESLint (fix) / Prettier |

Detalle completo en [DOCS.md](DOCS.md) y [CLAUDE.md](CLAUDE.md).

## Estructura

```
src/
├── app.module.ts
├── main.ts                 # Bootstrap, CORS, Swagger
├── auth/                   # Estrategias Passport, JWT, login/logout/refresh
├── admin-db/               # Cliente Drizzle MySQL `admin` (identidad, read-only)
├── admin-panel/            # Gestión de roles/permisos sobre admin.users.id
├── db/                     # Cliente Drizzle PostgreSQL + migraciones
├── redis/                  # RedisService (INCR, SADD, Pub/Sub, rate limit)
└── interceptors/           # Interceptores transversales
```

## Calidad y convenciones

- Reglas para IDE/agentes en [`.cursor/rules/`](.cursor/rules/) (arquitectura, DRY/KISS/SOLID, seguridad, testing, repositorios).
- Skills de flujo en [`.agents/skills/`](.agents/skills/) (refactor de auth, patrón de repositorio, PR gate, etc.).
- Quality gate antes de merge: `pnpm test:ci`.

## Licencia

UNLICENSED. Ajusta [`package.json`](package.json) y añade tu licencia al crear tu proyecto a partir de este template.
