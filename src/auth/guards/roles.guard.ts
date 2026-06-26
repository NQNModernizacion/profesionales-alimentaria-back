import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import { type DrizzleClient } from '../../db/db.client';
import { userRoles, roles } from '../../db/schema';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { type JwtPayload } from '../auth.types';

/**
 * Guard that enforces role-based access control using the `@Roles()` decorator.
 *
 * Resolves roles by joining `user_roles → roles` in PostgreSQL.
 * Must be applied AFTER `JwtAuthGuard` (which populates `request.user`).
 *
 * Register globally via APP_GUARD or per-module via `useGuards()`.
 *
 * @example
 * // Global registration (app.module.ts)
 * { provide: APP_GUARD, useClass: RolesGuard }
 *
 * // Per-route
 * @UseGuards(RolesGuard)
 * @Roles('admin')
 * @Get('protected')
 * handler() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → no role restriction
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('Sin contexto de usuario');
    }

    const rows = await this.db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.sub));

    const userRoleNames = new Set(rows.map((r) => r.name));
    const hasRole = required.some((r) => userRoleNames.has(r));

    if (!hasRole) {
      throw new ForbiddenException(
        `Se requiere uno de los roles: ${required.join(', ')}`,
      );
    }

    return true;
  }
}
