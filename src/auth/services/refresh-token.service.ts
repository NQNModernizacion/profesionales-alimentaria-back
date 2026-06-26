import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { TOKEN_REVOCATION_REPOSITORY } from '../auth.tokens';
import type { TokenRevocationRepository } from '../repositories/token-revocation.repository';
import { JwtPayload } from '../auth.types';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(TOKEN_REVOCATION_REPOSITORY)
    private readonly revocation: TokenRevocationRepository,
  ) {}

  /**
   * Verifies refresh JWT, ensures it is not revoked, then revokes the JTI for rotation.
   */
  async validateAndConsumeRefresh(request: Request): Promise<JwtPayload> {
    const authHeader = request.headers?.['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere refresh token en Authorization header',
      );
    }

    const token = authHeader.slice(7);
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new UnauthorizedException('JWT_REFRESH_SECRET no configurado');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, refreshSecret) as unknown as JwtPayload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token no es de tipo refresh');
    }

    const revoked = await this.revocation.isRevoked(payload.jti);
    if (revoked) {
      throw new UnauthorizedException('Token ya ha sido revocado');
    }

    await this.revocation.revokeForRemainingTtl(payload.jti, payload.exp);

    return payload;
  }
}
