import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users that have at least one of the given role names.
 *
 * @example
 * // Require 'admin' OR 'operador'
 * @Roles('admin', 'operador')
 * @Get('something')
 * handler() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
