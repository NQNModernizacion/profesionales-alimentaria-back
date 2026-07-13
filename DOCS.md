# Profesionales Alimentaria — Documentación Técnica

> Plantilla backend NestJS con identidad dual (MySQL `admin` + PostgreSQL), Redis, JWT y Docker. Diseñada como punto de partida para APIs internas donde la identidad vive en una BD corporativa (MySQL) y el negocio en PostgreSQL.

---

## Tabla de Contenidos

1. [Descripción general](#descripción-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura](#arquitectura)
4. [Identidad dual (MySQL `admin` + PostgreSQL)](#identidad-dual-mysql-admin--postgresql)
5. [Autenticación y autorización](#autenticación-y-autorización)
6. [Redis — usos soportados](#redis--usos-soportados)
7. [Variables de entorno](#variables-de-entorno)
8. [Docker](#docker)
9. [Scripts de `pnpm`](#scripts-de-pnpm)
10. [Estructura de `src/`](#estructura-de-src)
11. [Convenciones del repositorio](#convenciones-del-repositorio)
12. [Extender el template](#extender-el-template)

---

## Descripción general

Este repositorio es una **plantilla** para backends NestJS. Trae resuelto:

- Arranque de la app (`main.ts`) con CORS configurable, servir `uploads/` y Swagger automático fuera de producción.
- Conexión dual a bases de datos: **PostgreSQL** como BD de negocio (mediante Drizzle ORM) y **MySQL `admin`** como fuente de identidad (cuentas, personas).
- Auth con Passport JWT: login, refresh, logout, perfil — firma emitida por este backend.
- Primitivas de Redis (INCR, SADD, Pub/Sub, rate limiting) disponibles para cualquier feature.
- Docker Compose para productivo, desarrollo y tests.
- Skills de IA y reglas de repositorio (`.cursor/rules/`, `.agents/skills/`) para forzar convenciones al evolucionar el proyecto.
- Quality gate estricto: `pnpm test:ci` (lint + tests + cobertura de auth + build + audit).

La plantilla **no** incluye dominio de negocio. El módulo `app.controller.ts` sirve de placeholder — al hacer fork, elimina su contenido y añade tus features.

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Rol |
|---|---|---|
| NestJS | ^11 | Framework principal |
| TypeScript | ^5 | Tipado estático |
| Drizzle ORM | ^0.45 | Acceso a PostgreSQL y MySQL (dos instancias) |
| Passport.js | ^0.7 | Estrategia de autenticación JWT |
| `@nestjs/jwt` | ^11 | Firma/verificación de tokens |
| `@casl/ability` | ^6 | Ganchos para autorización fina por recurso |
| `@nestjs/swagger` | ^11 | Documentación automática de la API |
| Jest | ^30 | Unit / e2e |

### Datos e infraestructura

| Recurso | Rol |
|---|---|
| PostgreSQL | Base principal de la app (migraciones Drizzle, fuente de verdad del negocio) |
| MySQL `admin` | Base corporativa externa con `users` + `Personas` + `Usuarios`. Solo lectura desde esta API |
| Redis | Cache, rate limiting, Pub/Sub, contadores atómicos |

### Herramientas de desarrollo

| Herramienta | Uso |
|---|---|
| ESLint + Prettier | Estilo y lint (`pnpm lint` / `pnpm format`) |
| drizzle-kit | `db:generate`, `db:migrate`, `db:studio` |
| tsx | Ejecutar scripts TypeScript ad-hoc (incluido `initTemplate.ts`) |
| Docker Compose | `docker-compose.yml` + `docker-compose.dev.yml` + `docker-compose.test.yml` |

---

## Arquitectura

### Patrón: Modular Layered (NestJS nativo)

Cada feature es un módulo independiente con capas internas:

```
Controller  →  Service  →  Repository  →  BD (Drizzle) / Redis
```

- **Controllers**: mapeo HTTP, validación (DTO + pipes). No acceden a BD ni criptografía directamente.
- **Services**: orquestan el caso de uso. Dependen de interfaces de repositorio y servicios auxiliares.
- **Repositories**: encapsulan persistencia (Drizzle PostgreSQL, Drizzle MySQL `admin`, Redis). Nunca usan tipos HTTP de Nest.
- **Guards / Strategies**: delgados; delegan la lógica de identidad y permisos a servicios inyectables.
- **`shared/`** (si aparece al crecer): guards, decoradores, pipes transversales.

### Flujo típico de un request autenticado

```
HTTP request → Authorization: Bearer <JWT>
  ↓
JwtAuthGuard (Passport)     ← verifica firma con JWT_SECRET
  ↓
JwtStrategy.validate        ← payload.sub = admin.users.id (entero)
  ↓
AuthorizationService / CASL ← carga roles/permisos desde PostgreSQL por user_id
  ↓
Controller → Service → Repository
  ↓
Response
```

### Doble cliente Drizzle

| Cliente | Conexión | Token de inyección | Uso |
|---|---|---|---|
| PostgreSQL | `DATABASE_URL` | `DRIZZLE` | Datos de negocio + tablas de autorización |
| MySQL `admin` | `ADMIN_DATABASE_URL` | `DRIZZLE_ADMIN` | Identidad (solo lectura) |

Los módulos `DbModule` y `AdminDbModule` exponen cada cliente con un `Symbol` token propio. Los servicios inyectan con `@Inject(DRIZZLE)` o `@Inject(DRIZZLE_ADMIN)` según corresponda.

El cliente PostgreSQL se crea con `casing: 'snake_case'` — Drizzle mapea automáticamente campos camelCase del schema a columnas snake_case.

---

## Identidad dual (MySQL `admin` + PostgreSQL)

### Principio fundamental

> La base `admin` (**MySQL**) es la **única** fuente de verdad de identidad. **No existe tabla `users` en PostgreSQL.** Este backend valida credenciales contra `admin.users`, emite su propio JWT y lee roles/permisos desde PostgreSQL indexados por `admin.users.id`.

### Tablas relevantes en MySQL `admin` (solo lectura)

| Tabla | Rol |
|---|---|
| `users` | Cuenta de login. `id` (bigint, PK), `email`, `password` (hash). El claim JWT `sub` = este `id`. |
| `Usuarios` | Pivote entre `users` y `Personas`. Campos clave: `ReferenciaID` = `users.id`, `PersonaID` → `Personas.id`. |
| `Personas` | Datos personales: `documento`, nombres, apellidos, `correoElectronico`, dirección, etc. |

Flujos soportados:

- **Login por email** → consulta directa en `users`.
- **Login por documento** → `Personas` (por `documento`) → `Usuarios.PersonaID` → `users`.

### PostgreSQL

Almacena:

- Datos de negocio de la app que construyas sobre el template.
- Tablas de autorización (roles/permisos). En este template se deja el cableado para CASL; puedes reemplazar por Casbin, `nest-access-control` u otra librería persistiendo en Postgres.
- Opcionalmente, tablas de auditoría (`activity_log`).

Referencias a personas en tus tablas deben usar **`user_id` (bigint) = `admin.users.id`**. No dupliques identidad en Postgres.

---

## Autenticación y autorización

### Payload del JWT

```json
{
  "sub": 12345,
  "email": "usuario@ejemplo.com",
  "iat": 1700000000,
  "exp": 1700086400
}
```

- `sub` es **entero** = `admin.users.id` (MySQL).
- **No** incluye `role`. Los roles se consultan en PostgreSQL.
- Firma con `JWT_SECRET` (y refresh con `JWT_REFRESH_SECRET`).

### Endpoints de auth (referencia)

| Método | Ruta | Body | Auth | Descripción |
|---|---|---|---|---|
| POST | `/auth/login` | `{ type, _id, password?, device_name? }` | No | `type`: `internal` (email/documento + password) u otras estrategias |
| POST | `/auth/refresh` | — | Bearer refresh | Rotación de token |
| POST | `/auth/logout` | — | Bearer | Invalida el token actual (si se usa lista de revocación) |
| GET | `/auth/me` | — | Bearer | Perfil mínimo + roles efectivos |

### Perfiles de duración del JWT

`JWT_LIFETIME_PROFILE` conmuta la TTL de access + refresh en bloque:

| Valor | Access TTL | Refresh TTL | Uso |
|---|---|---|---|
| `default` | `JWT_EXPIRES_IN` (p. ej. `15m`) | `JWT_REFRESH_EXPIRES_IN` (p. ej. `7d`) | Producción |
| `extended` | `24h` (hardcoded) | `90d` (hardcoded) | Staging / QA |
| `infinite` | `100y` | `100y` | Desarrollo local — **no usar en producción pública** |

### Bootstrap del primer admin

`BOOTSTRAP_ADMIN_EMAIL` identifica al primer admin en `admin.users`. Al arrancar, si ese usuario no tiene rol asignado en PostgreSQL, se le asigna `admin`. Una vez configurado, la variable puede retirarse del entorno.

### Autorización

El template deja CASL instalado como base (`@casl/ability`), pero el sistema de roles/permisos concreto es una **decisión del fork**:

- Persistencia en PostgreSQL (no en MySQL `admin`).
- Indexado por `admin.users.id`.
- Patrón recomendado: definir una `AbilityFactory` que cargue reglas por `user_id` desde BD.

---

## Redis — usos soportados

El `RedisService` del módulo `redis/` expone primitivas que cualquier feature puede usar:

| Primitiva | Uso típico |
|---|---|
| `INCR` / `DECR` / `GET` | Contadores atómicos (stats, counters en caliente) |
| `SADD` / `SISMEMBER` / `SREM` | Sets de unicidad (ya-procesado, ya-votado, etc.) |
| `SET` con TTL | Caché con expiración (ej. respuestas costosas) |
| `PUBLISH` / `SUBSCRIBE` | Pub/Sub para notificaciones internas o SSE |
| Rate limiting | Claves `ratelimit:{ip}:{window}` con `INCR` + TTL |

`REDIS_URL` define la conexión. En Docker usa `redis://redis:6379`; en local `redis://127.0.0.1:6379`.

---

## Variables de entorno

Referencia tomada de [`.env.example`](.env.example). Usa `.env` para desarrollo local y `.env.docker` / `.env.test.docker` dentro de Compose.

### Aplicación

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `PORT` | `3000` | Puerto HTTP |
| `API_BASE_URL` | `http://localhost:3000` | Base absoluta para URLs de assets (p. ej. `/uploads/...`) |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen(es) permitido(s), coma-separados |

### Persistencia

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://profesionales_alimentaria_user:profesionales_alimentaria_password@localhost:5432/profesionales_alimentaria` | PostgreSQL (Drizzle) |
| `ADMIN_DATABASE_URL` | `mysql://root@localhost:3306/admin` | MySQL `admin` (solo lectura) |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis |

### Auth / JWT

| Variable | Ejemplo | Descripción |
|---|---|---|
| `JWT_SECRET` | `cambiar-en-produccion` | Firma del access token |
| `JWT_REFRESH_SECRET` | `cambiar-en-produccion` | Firma del refresh token |
| `ADMIN_JWT_SECRET` | `cambiar-en-produccion` | Secreto compartido con sistemas externos (si aplica) |
| `ADMIN_JWT_ALGORITHM` | `HS256` | Algoritmo del token externo |
| `JWT_LIFETIME_PROFILE` | `default` | `default` \| `extended` \| `infinite` |
| `JWT_EXPIRES_IN` | `15m` | Solo en perfil `default` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Solo en perfil `default` |
| `ADMIN_API_URL` | `http://admin.local/api` | URL de la API `admin` externa, si se consume |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@ejemplo.com` | Email del primer admin (retirar después del arranque) |

### Rate limiting

| Variable | Ejemplo | Descripción |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana en milisegundos |
| `RATE_LIMIT_MAX_REQUESTS` | `10` | Máximo por IP por ventana |

### Flush Redis → Postgres (opcional, útil para features con alta escritura)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `FLUSH_INTERVAL_MS` | `5000` | Intervalo de flush |
| `FLUSH_BATCH_SIZE` | `500` | Tamaño de batch que dispara flush anticipado |

---

## Docker

Tres archivos Compose:

| Archivo | Propósito |
|---|---|
| [`docker-compose.yml`](docker-compose.yml) | Stack base: app (producción) + PostgreSQL + Redis |
| [`docker-compose.dev.yml`](docker-compose.dev.yml) | Overlay de desarrollo (watch mode, polling para Windows) |
| [`docker-compose.test.yml`](docker-compose.test.yml) | Stack aislado de tests (postgres-test:5433, redis-test:6380) |

Comandos `pnpm`:

```bash
pnpm docker:up        # Compose productivo
pnpm docker:down
pnpm docker:logs
pnpm docker:dev       # Overlay dev con hot reload
pnpm docker:dev:down
pnpm docker:test      # Tests e2e en contenedores aislados
```

El `Dockerfile` es multi-stage (`base` → `deps` → `build` → `production`) usando `node:22-alpine` + pnpm vía corepack.

---

## Scripts de `pnpm`

Desde [`package.json`](package.json):

```bash
# Desarrollo
pnpm start              # Nest (sin watch)
pnpm start:dev          # Watch mode
pnpm start:debug        # Debug + watch
pnpm start:prod         # node dist/main
pnpm build              # nest build

# Base de datos
pnpm db:generate        # Generar migración Drizzle
pnpm db:migrate         # Aplicar migraciones
pnpm db:seed            # Seed (src/db/seed.ts con tsx)
pnpm db:seed:prod       # Seed sobre build compilado
pnpm db:studio          # Drizzle Studio

# Tests
pnpm test
pnpm test:watch
pnpm test:cov
pnpm test:cov:auth      # Cobertura con umbrales estrictos en auth/
pnpm test:e2e
pnpm test:ci            # Quality gate completo

# Lint / format
pnpm lint
pnpm format

# Docker (ver sección previa)
pnpm docker:up / :down / :logs / :dev / :dev:down / :test
```

---

## Estructura de `src/`

```
src/
├── app.module.ts            # Módulo raíz
├── main.ts                  # Bootstrap: CORS, uploads, Swagger
├── app.controller.ts        # Placeholder (eliminar al empezar tu feature)
├── app.service.ts           # Placeholder
├── auth/                    # Estrategias, guards, controlador de auth
├── admin-db/                # Cliente Drizzle MySQL admin (DRIZZLE_ADMIN)
├── admin-panel/             # Gestión de roles/permisos sobre admin.users.id
├── db/                      # Cliente Drizzle PostgreSQL (DRIZZLE) + migraciones
├── redis/                   # RedisService
└── interceptors/            # Interceptores transversales (logging, transform)
```

---

## Convenciones del repositorio

### Reglas para IDE / agentes IA

[`.cursor/rules/`](.cursor/rules/) contiene reglas automáticas:

| Regla | Ámbito |
|---|---|
| `architecture-boundaries.mdc` | Layering (controller → service → repo) |
| `data-access-patterns.mdc` | Patrón de repositorio |
| `dry-kiss-solid.mdc` | Checklist antes de merge |
| `error-handling-observability.mdc` | Excepciones y logging |
| `performance-reliability.mdc` | Rendimiento y fiabilidad |
| `security-auth.mdc` | Reglas de seguridad en `src/auth/**` |
| `testing-standards.mdc` | Convenciones de tests |
| `typescript-backend-quality.mdc` | Calidad TS |

### Skills de flujo

[`.agents/skills/`](.agents/skills/):

- `auth-refactor-standards/` — refactor seguro de `src/auth`.
- `repo-pattern-enforcer/` — enforcer del patrón repositorio.
- `secure-auth-checklist/` — checklist antes de tocar JWT/guards.
- `pr-quality-gate/` — gate pre-PR.
- `clean-code/`, `skill-creator/`, `find-skills/` — utilitarios.

### Quality gate

`pnpm test:ci` ejecuta:

1. ESLint.
2. Jest unit.
3. Cobertura auth (`jest.auth.config.cjs`) con umbrales.
4. `nest build`.
5. `pnpm audit --audit-level=critical`.

GitHub Actions corre lo mismo en push/PR (`.github/workflows/ci.yml`).

### Decisiones clave (no revertir sin justificación)

- **No `users` en PostgreSQL** — identidad solo en MySQL `admin`.
- **Roles/permisos persistidos en PostgreSQL**, nunca como columna en una tabla `users` replicada.
- **Redis** como fuente de verdad **en caliente** para contadores / unicidad; PostgreSQL como store durable.
- **Doble cliente Drizzle** con tokens distintos; no mezclar.

---

## Extender el template

Para añadir una nueva feature (ej. `orders`):

1. Crea el directorio del módulo:

   ```
   src/orders/
   ├── orders.module.ts
   ├── orders.controller.ts
   ├── orders.service.ts
   ├── orders.repository.ts
   ├── dto/
   │   └── create-order.dto.ts
   └── entities/
       └── order.schema.ts     # Tabla Drizzle
   ```

2. Agrega la tabla al schema PostgreSQL (`src/db/schema.ts` o un archivo importado), genera y aplica la migración:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

3. Inyecta el cliente Drizzle en el repositorio:

   ```ts
   @Injectable()
   export class OrdersRepository {
     constructor(@Inject(DRIZZLE) private readonly db: PostgresDb) {}
   }
   ```

4. Registra el módulo en [`app.module.ts`](src/app.module.ts).

5. Si la feature necesita identidad, inyecta `AuthService` o usa `JwtAuthGuard` + `@Req()` para leer `user_id` del token (= `admin.users.id`).

6. Si necesitas leer la BD `admin`, inyecta con `@Inject(DRIZZLE_ADMIN)`.

7. Añade tests (`*.spec.ts`) y corre `pnpm test:ci` antes de abrir PR.

---

*Este documento es la fuente de verdad del diseño del template. Actualízalo cuando cambies decisiones arquitectónicas.*
