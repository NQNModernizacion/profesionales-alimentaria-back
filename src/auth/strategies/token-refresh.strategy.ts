import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AdminUser } from '../auth.types';
import { IAuthStrategy } from '../auth-strategy.interface';
import { AuthIdentityService } from '../services/auth-identity.service';
import { RefreshTokenService } from '../services/refresh-token.service';

@Injectable()
export class TokenRefreshStrategy implements IAuthStrategy {
  constructor(
    private readonly refreshToken: RefreshTokenService,
    private readonly authIdentity: AuthIdentityService,
  ) {}

  async authenticate(
    _dto: { _id?: string; password?: string },
    request?: Request,
  ): Promise<AdminUser> {
    if (!request) {
      throw new UnauthorizedException(
        'Se requiere refresh token en Authorization header',
      );
    }

    const payload = await this.refreshToken.validateAndConsumeRefresh(request);

    return this.authIdentity.loadAdminUserById(
      payload.sub,
      `Usuario con ID ${payload.sub} no encontrado`,
    );
  }
}
