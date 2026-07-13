# Profesionales Alimentaria — Backend

> API NestJS del **Registro Municipal de Profesionales del Área Alimentaria** (Dirección General de Bromatología, Municipalidad de Neuquén).

Reemplaza el alta en papel por un flujo digital: un profesional se **inscribe** cargando datos y documentación, Bromatología **valida y da el alta**, y los comercios consultan un **directorio público** de profesionales aprobados.

La lógica de negocio completa (actores, ciclo de vida de la solicitud, reglas de privacidad) vive en [`../REQUIREMENT.md`](../REQUIREMENT.md). Leerlo antes de tocar reglas de dominio.

## Dominio en una pantalla

**Actores**

| Actor | Objetivo |
|---|---|
| **Profesional / Solicitante** | Inscribirse en el registro y, opcionalmente, aparecer en el directorio. |
| **Administrador (Bromatología)** | Verificar requisitos y mantener el registro depurado y confiable. |
| **Comercio / Visitante** | Encontrar un profesional habilitado para dirección técnica, asesoramiento, etc. |

**Ciclo de vida de la Solicitud**

```
Borrador → Enviada → En revisión → Aprobada → Publicada ⇄ No publicada
                                  ↘ Rechazada (requiere motivo)
```

- Solo se dan de alta profesionales con **título vinculado a alimentos** y **matrícula vigente**.
- Enviar exige documentación obligatoria completa + aceptación de la **Declaración Jurada**.
- El formulario de inscripción **no es público**: requiere cuenta autenticada.
- Cada profesional solo ve/edita **sus propias solicitudes** y solo en estados editables (`Borrador` / `Enviada`).
- Todo **rechazo** debe registrar su motivo (trazabilidad + feedback al profesional).

**Privacidad**

- La publicación en el directorio requiere **consentimiento explícito**, independiente del envío de la solicitud.
- El directorio público expone **únicamente**: nombre y apellido, profesión, matrícula, áreas de actuación, correo y teléfono.
- Documentos adjuntos y datos sensibles (DNI, CUIT, fecha de nacimiento, domicilio) **nunca** son públicos: solo los ve el administrador autenticado.

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
| Autorización | CASL (`@casl/ability`) |
| Docs API | Swagger (`@nestjs/swagger`) |
| Testing | Jest (unit + e2e) + cobertura dedicada de `auth` |
| CI local | `pnpm test:ci` (lint + test + auth coverage + build + audit) |
| Contenedores | Docker + Docker Compose (base / dev / test) |

### Identidad dual

La identidad vive **exclusivamente en MySQL `admin`** (externa, read-only). PostgreSQL es la base de negocio y autorización. **No hay tabla `users` en PostgreSQL.** El `sub` del JWT es siempre `admin.users.id`; los roles/permisos se resuelven en PostgreSQL. Detalle en [`CLAUDE.md`](CLAUDE.md) y [`DOCS.md`](DOCS.md).

## Requisitos

- Node.js 22+
- pnpm 10+ (`corepack enable` — la versión está pineada en `package.json`)
- Docker Desktop (opcional pero recomendado)
- Acceso a una BD MySQL con el esquema `admin` (credenciales/personas) para el flujo de login real

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

Cada feature de negocio nueva agrega un directorio hermano con `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` y se registra en `app.module.ts`.

## Calidad y convenciones

- Reglas para IDE/agentes en [`.cursor/rules/`](.cursor/rules/) (arquitectura, DRY/KISS/SOLID, seguridad, testing, repositorios).
- Skills de flujo en [`.agents/skills/`](.agents/skills/) (refactor de auth, patrón de repositorio, PR gate, etc.).
- Quality gate antes de merge: `pnpm test:ci`.

## Licencia

UNLICENSED.
