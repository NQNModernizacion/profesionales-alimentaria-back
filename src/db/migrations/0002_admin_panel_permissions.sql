-- Migration: restructure role_permissions + add permissions + user_permissions
-- for admin panel support

-- 1. Drop old role_permissions (action/subject columns, serial PK)
DROP TABLE IF EXISTS "role_permissions";--> statement-breakpoint

-- 2. Create global permissions catalogue
CREATE TABLE "permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) UNIQUE NOT NULL,
  "description" text,
  "action" varchar(100) NOT NULL,
  "subject" varchar(100) NOT NULL
);--> statement-breakpoint

-- 3. Re-create role_permissions as a join table
CREATE TABLE "role_permissions" (
  "role_id" integer NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permission_id" integer NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("role_id", "permission_id")
);--> statement-breakpoint

-- 4. Direct user permissions (without going through a role)
CREATE TABLE "user_permissions" (
  "user_id" bigint NOT NULL,
  "permission_id" integer NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("user_id", "permission_id")
);
