import { Inject, Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import { type DrizzleClient } from '../../db/db.client';
import {
  userRoles,
  roles,
  rolePermissions,
  userPermissions,
  permissions,
} from '../../db/schema';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
/** Permission subjects from DB (`role_permissions.subject`); includes e.g. `'all'`. */
export type Subjects = string;

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async createForUser(userId: number): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    try {
      // Permisos por rol: user_roles → roles → role_permissions → permissions
      const roleRows = await this.db
        .select({
          action: permissions.action,
          subject: permissions.subject,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(eq(userRoles.userId, userId));

      // Permisos directos: user_permissions → permissions
      const directRows = await this.db
        .select({
          action: permissions.action,
          subject: permissions.subject,
        })
        .from(userPermissions)
        .innerJoin(
          permissions,
          eq(userPermissions.permissionId, permissions.id),
        )
        .where(eq(userPermissions.userId, userId));

      for (const row of [...roleRows, ...directRows]) {
        can(row.action as Actions, row.subject);
      }
    } catch {
      // Return empty ability if DB unavailable — deny all
    }

    return build();
  }
}
