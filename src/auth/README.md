# Autenticación — referencia y arquitectura

Este directorio contiene una **referencia en Laravel** (archivos `.php.txt`) y el **volcado de estructura** MySQL (`dbstructure/personas.sql`). No es el código NestJS ejecutable.

## Dónde vive cada cosa

| Dónde | Qué hay |
|---|---|
| **MySQL `admin`** | Tabla **`users`**: login (`id`, `email`, `password`, …). Pivote **`Usuarios`**, tabla **`Personas`**: datos personales (`documento`, nombres, …). **Fuente de verdad de identidad.** |
| **PostgreSQL (BD de negocio)** | **No** hay tabla `users`. Datos de negocio de la app, tablas de la **librería de roles/permisos** (p. ej. CASL o Casbin) y opcionalmente auditoría. Referencias a personas: **`user_id`** = `admin.users.id`. |

## Roles, permisos y activity log (como Spatie en Laravel)

En Laravel usas **spatie/laravel-permission** y **spatie/laravel-activitylog**. En NestJS no existe un solo paquete idéntico; en **`DOCS.md`** (sección *Autorización y auditoría*) está la tabla recomendada:

- **Roles/permisos en BD:** **Casbin + `nest-authz`** (RBAC/ABAC persistido), o **`nest-access-control`**, o **CASL** (`@casl/ability`) con reglas cargadas desde BD.
- **Auditoría:** **`nestjs-auditlog`**, **`@elchinabilov/nestjs-audit-logs`** (TypeORM), o **interceptor + tabla `activity_log`** con Drizzle.

**Decisión:** no implementar matriz de permisos ni logs de negocio a mano; usar librería(s) y persistir en PostgreSQL.

## Objetivo del diseño

1. **Identidad** solo en **MySQL `admin`** (`users` / `Usuarios` / `Personas`).
2. **JWT** emitido por este backend; `sub` entero = `admin.users.id`.
3. **Roles de la aplicación** en PostgreSQL vía **librería** (sujeto = `user_id`), sin duplicar usuario.

## Modelo de datos en `admin` (MySQL)

Alineado a `models/*.php.txt` y `dbstructure/personas.sql`:

```
admin.users (id PK, email, password, …)
    ↑
    │  ReferenciaID
admin.Usuarios  ←→  PersonaID
                         ↓
                   admin.Personas (documento, nombres, …)
```

## ¿Varias conexiones como en Laravel?

**Sí.** Dos URLs (`DATABASE_URL`, `ADMIN_DATABASE_URL`), dos clientes ORM, inyección por módulo. Ver **`DOCS.md`**.

## Mapeo `type` → comportamiento

| `type` | Idea |
|---|---|
| `internal` | Email → `users`; documento → `Personas` → `Usuarios` → `users`. |
| `enter_app` | Carga por `_id` = `users.id` (entero). |
| `refresh_*` | Rotación de token (política JWT propia). |

## Checklist NestJS

- [ ] MySQL (`ADMIN_DATABASE_URL`) solo para consultas de identidad en login.
- [ ] PostgreSQL **sin** tabla `users`; **roles/permisos** con librería (Casbin u otra).
- [ ] JWT con `sub` = `admin.users.id`.
- [ ] Guards que usen la librería (no columna `role` en Postgres).
- [ ] Endpoints de gestión de roles por **`adminUserId`** (ver `DOCS.md`, `/admin-users/...`).

---

*Mantener alineado con `DOCS.md`.*
