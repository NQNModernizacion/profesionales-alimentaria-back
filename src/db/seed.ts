import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { type DrizzleClient } from './db.client';
import { roles, rolePermissions, userRoles, permissions } from './schema';

const ROLES = [
  {
    name: 'admin',
    description: 'Administrador de la aplicación',
  },
  {
    name: 'admin.app',
    description: 'Administrador de la aplicación de votación',
  },
];

const PERMISSION_SEEDS: Array<{
  name: string;
  action: string;
  subject: string;
  description: string;
}> = [
  {
    name: 'admin.permission.view',
    action: 'read',
    subject: 'admin.permission',
    description: 'Ver permisos del sistema',
  },
  {
    name: 'admin.permission.asign',
    action: 'manage',
    subject: 'admin.permission',
    description: 'Asignar permisos a usuarios',
  },
  {
    name: 'admin.role-permission.asign',
    action: 'manage',
    subject: 'admin.role-permission',
    description: 'Asignar permisos a roles',
  },
  {
    name: 'admin.role.view',
    action: 'read',
    subject: 'admin.role',
    description: 'Ver roles del sistema',
  },
  {
    name: 'admin.user.view',
    action: 'read',
    subject: 'admin.user',
    description: 'Ver usuarios',
  },
];

const ADMIN_USER_IDS = [
  138025, // user Nahue
  83856, // user Mau
  105970, // user Leo
  100473, // user Guido
  6884, // user Agus
  129674, // user Gonza
  110396, // user Gabi
  173816, // user Santi
  1192, // user Nati
];

export async function runSeed(db: DrizzleClient): Promise<void> {
  // 1. Roles
  await db.insert(roles).values(ROLES).onConflictDoNothing();

  // 2. Permissions catalogue
  await db.insert(permissions).values(PERMISSION_SEEDS).onConflictDoNothing();

  // 3. Resolver IDs
  const [adminRoleRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'admin'));
  if (!adminRoleRow) throw new Error('admin role not found after seed');
  const adminRoleId = adminRoleRow.id;

  const permRows = await db.select({ id: permissions.id }).from(permissions);

  // 4. Assign all permissions to admin role
  if (permRows.length > 0) {
    await db
      .insert(rolePermissions)
      .values(
        permRows.map((p) => ({ roleId: adminRoleId, permissionId: p.id })),
      )
      .onConflictDoNothing();
    console.log(`[seed] Linked ${permRows.length} permissions to admin role`);
  }

  // 5. User-roles — composite PK → onConflictDoNothing
  await db
    .insert(userRoles)
    .values(ADMIN_USER_IDS.map((userId) => ({ userId, roleId: adminRoleId })))
    .onConflictDoNothing();

  console.log('[seed] Roles and user-role assignments seeded');
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL env var is required');
  // max: 1 — script de ejecución única, no necesita pool
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  try {
    await runSeed(db);
    console.log('[seed] Done.');
  } finally {
    await sql.end();
  }
}

// CJS guard — funciona porque package.json no tiene "type": "module"
if (require.main === module) {
  main().catch((err) => {
    console.error('[seed] Fatal:', err);
    process.exit(1);
  });
}
