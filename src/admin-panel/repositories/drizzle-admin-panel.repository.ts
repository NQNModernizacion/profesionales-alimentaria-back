import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import { type DrizzleClient } from '../../db/db.client';
import { DRIZZLE_ADMIN } from '../../admin-db/admin-db.constants';
import { type AdminDrizzleClient } from '../../admin-db/admin-db.client';
import {
  roles,
  permissions,
  userRoles,
  userPermissions,
  rolePermissions,
  campaigns,
} from '../../db/schema';
import {
  adminPersonas,
  adminUsuarios,
  adminUsers,
} from '../../admin-db/admin-db.schema';
import { withFederatedGuard } from '../../auth/repositories/federated-errors';
import type {
  AdminPanelRepository,
  CampaignAdminRow,
  RoleRow,
  PermissionRow,
  UserWithRolesAndPermissions,
} from './admin-panel.repository';

@Injectable()
export class DrizzleAdminPanelRepository implements AdminPanelRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    @Inject(DRIZZLE_ADMIN) private readonly adminDb: AdminDrizzleClient,
  ) {}

  // ── Bootstrap ────────────────────────────────────────────────────────────

  getAllRoles(): Promise<RoleRow[]> {
    return this.db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .orderBy(roles.name);
  }

  getAllPermissions(): Promise<PermissionRow[]> {
    return this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(permissions.name);
  }

  getAllCampaigns(): Promise<CampaignAdminRow[]> {
    return this.db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        bannerUrl: campaigns.bannerUrl,
        backgroundUrl: campaigns.backgroundUrl,
        startsAt: campaigns.startsAt,
        endsAt: campaigns.endsAt,
        status: campaigns.status,
        ownerId: campaigns.ownerId,
        requiredAuth: campaigns.requiredAuth,
        voterIdentityType: campaigns.voterIdentityType,
        options: campaigns.options,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .orderBy(campaigns.createdAt);
  }

  getCampaignById(id: number): Promise<CampaignAdminRow | null> {
    return this.db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        description: campaigns.description,
        bannerUrl: campaigns.bannerUrl,
        backgroundUrl: campaigns.backgroundUrl,
        startsAt: campaigns.startsAt,
        endsAt: campaigns.endsAt,
        status: campaigns.status,
        ownerId: campaigns.ownerId,
        requiredAuth: campaigns.requiredAuth,
        voterIdentityType: campaigns.voterIdentityType,
        options: campaigns.options,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async getAllUsersWithRolesOrPermissions(): Promise<
    UserWithRolesAndPermissions[]
  > {
    // 1. Get all user-role assignments (PostgreSQL)
    const userRoleRows = await this.db
      .select({ userId: userRoles.userId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    // 2. Get all direct user-permission assignments (PostgreSQL)
    const userPermRows = await this.db
      .select({ userId: userPermissions.userId, permName: permissions.name })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id));

    // 3. Collect unique user IDs across both tables
    const allUserIds = [
      ...new Set([
        ...userRoleRows.map((r) => r.userId),
        ...userPermRows.map((r) => r.userId),
      ]),
    ];

    if (!allUserIds.length) return [];

    // 4. Fetch emails from MySQL admin (cross-DB: adminDb, not db)
    const adminUserRows = await withFederatedGuard(() =>
      this.adminDb
        .select({ id: adminUsers.id, email: adminUsers.email })
        .from(adminUsers)
        .where(inArray(adminUsers.id, allUserIds)),
    );

    // 5. Build per-user role/permission maps
    const rolesByUser = new Map<number, Set<string>>();
    const permsByUser = new Map<number, Set<string>>();

    for (const r of userRoleRows) {
      if (!rolesByUser.has(r.userId)) rolesByUser.set(r.userId, new Set());
      rolesByUser.get(r.userId)!.add(r.roleName);
    }
    for (const p of userPermRows) {
      if (!permsByUser.has(p.userId)) permsByUser.set(p.userId, new Set());
      permsByUser.get(p.userId)!.add(p.permName);
    }

    return adminUserRows
      .sort((a, b) => a.email.localeCompare(b.email))
      .map((u) => ({
        id: u.id,
        email: u.email,
        roles: [...(rolesByUser.get(u.id) ?? [])],
        permissions: [...(permsByUser.get(u.id) ?? [])],
      }));
  }

  // ── Persona lookup (MySQL admin) ─────────────────────────────────────────

  findPersonaByDni(dni: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select({
          id: adminPersonas.id,
          documento: adminPersonas.documento,
          nombres: adminPersonas.nombres,
          apellidos: adminPersonas.apellidos,
          nombreCompleto: adminPersonas.nombreCompleto,
          correoElectronico: adminPersonas.correoElectronico,
          celular: adminPersonas.celular,
          genero: adminPersonas.genero,
          direccionCompleta: adminPersonas.direccionCompleta,
        })
        .from(adminPersonas)
        .where(eq(adminPersonas.documento, dni))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findUsuarioIdByPersonaId(personaId: number): Promise<number | null> {
    return withFederatedGuard(() =>
      this.adminDb
        .select({ referenciaId: adminUsuarios.referenciaId })
        .from(adminUsuarios)
        .where(eq(adminUsuarios.personaId, personaId))
        .limit(1)
        .then((rows) => (rows[0] ? rows[0].referenciaId : null)),
    );
  }

  findUserById(userId: number): Promise<{ id: number; email: string } | null> {
    return withFederatedGuard(() =>
      this.adminDb
        .select({ id: adminUsers.id, email: adminUsers.email })
        .from(adminUsers)
        .where(eq(adminUsers.id, userId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  // ── Roles for a user (PostgreSQL) ────────────────────────────────────────

  async getUserRoleNames(userId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => r.name);
  }

  async getUserAllPermissionNames(userId: number): Promise<string[]> {
    // Via roles
    const roleRows = await this.db
      .select({ name: permissions.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    // Direct
    const directRows = await this.db
      .select({ name: permissions.name })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId));

    const names = new Set([
      ...roleRows.map((r) => r.name),
      ...directRows.map((r) => r.name),
    ]);
    return [...names];
  }

  // ── Sync operations (PostgreSQL) ─────────────────────────────────────────

  async assignRolesByIds(userId: number, roleIds: number[]): Promise<void> {
    if (!roleIds.length) return;
    const validRoles = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, roleIds));
    if (!validRoles.length) return;

    await this.db
      .insert(userRoles)
      .values(validRoles.map((r) => ({ userId, roleId: r.id })))
      .onConflictDoNothing();
  }

  async assignRolesByNames(userId: number, roleNames: string[]): Promise<void> {
    if (!roleNames.length) return;
    const validRoles = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.name, roleNames));
    if (!validRoles.length) return;

    await this.db
      .insert(userRoles)
      .values(validRoles.map((r) => ({ userId, roleId: r.id })))
      .onConflictDoNothing();
  }

  async syncUserPermissions(
    userId: number,
    permissionIds: number[],
  ): Promise<void> {
    await this.db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, userId));

    if (!permissionIds.length) return;

    const valid = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));
    if (!valid.length) return;

    await this.db
      .insert(userPermissions)
      .values(valid.map((p) => ({ userId, permissionId: p.id })));
  }

  async syncRolePermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<void> {
    await this.db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    if (!permissionIds.length) return;

    const valid = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));
    if (!valid.length) return;

    await this.db
      .insert(rolePermissions)
      .values(valid.map((p) => ({ roleId, permissionId: p.id })));
  }

  findRoleById(roleId: number): Promise<RoleRow | null> {
    return this.db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async getRolePermissionNames(roleId: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.name);
  }
}
