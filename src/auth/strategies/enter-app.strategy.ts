import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminUser } from '../auth.types';
import { IAuthStrategy } from '../auth-strategy.interface';
import { AuthIdentityService } from '../services/auth-identity.service';

@Injectable()
export class EnterAppStrategy implements IAuthStrategy {
  constructor(private readonly authIdentity: AuthIdentityService) {}

  async authenticate(
    dto: { _id?: string },
    request?: Request,
  ): Promise<AdminUser> {
    const internalSecret = request?.headers?.['x-internal-secret'] as
      | string
      | undefined;
    const configuredSecret = process.env['INTERNAL_SECRET'];

    if (!configuredSecret) {
      throw new UnauthorizedException(
        'Estrategia enter_app no configurada (INTERNAL_SECRET)',
      );
    }

    if (!internalSecret || internalSecret !== configuredSecret) {
      throw new UnauthorizedException('X-Internal-Secret inválido o ausente');
    }

    const rawId = dto._id;
    if (!rawId) {
      throw new BadRequestException('Se requiere _id (user ID) para enter_app');
    }

    const userId = parseInt(rawId, 10);
    if (isNaN(userId)) {
      throw new BadRequestException(
        '_id debe ser un entero (user ID) para enter_app',
      );
    }

    return this.authIdentity.loadAdminUserById(userId);
  }
}
