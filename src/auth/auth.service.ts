import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { Request } from 'express';
import { DRIZZLE } from '../db/db.constants';
import { type DrizzleClient } from '../db/db.client';
import {
  userRoles,
  roles,
  rolePermissions,
  permissions,
  userPermissions,
} from '../db/schema';
import { TOKEN_REVOCATION_REPOSITORY } from './auth.tokens';
import type { TokenRevocationRepository } from './repositories/token-revocation.repository';
import { JwtPayload, LoginDto, LoginResponse, TokenPair } from './auth.types';
import { AuthStrategyResolver } from './strategies/auth-strategy.resolver';
import { resolveJwtExpiresIn } from './config/jwt-lifetime';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly strategyResolver: AuthStrategyResolver,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    @Inject(TOKEN_REVOCATION_REPOSITORY)
    private readonly tokenRevocation: TokenRevocationRepository,
  ) {}

  onModuleInit(): void {
    const { profile } = resolveJwtExpiresIn(this.configService, this.logger);
    if (process.env['NODE_ENV'] === 'production' && profile !== 'default') {
      this.logger.warn(
        `JWT_LIFETIME_PROFILE=${profile} en producción: evaluar riesgo de seguridad (tokens de larga duración).`,
      );
    }
  }

  async login(dto: LoginDto, request?: Request): Promise<LoginResponse> {
    const strategy = this.strategyResolver.resolve(dto.type);
    const user = await strategy.authenticate(dto, request);

    // Only verify password when dto.password is provided
    if (dto.password !== undefined) {
      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) {
        // Import UnauthorizedException lazily to keep the import clean
        const { UnauthorizedException } = await import('@nestjs/common');
        throw new UnauthorizedException('Credenciales inválidas');
      }
    }

    const tokenPair = this.issueTokenPair(user.id, user.email);
    const { roles: userRoleNames, permissions } =
      await this.loadRolesAndPermissions(user.id);

    return {
      token_type: 'Bearer',
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_at: tokenPair.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        auth_method: dto.type,
        persona: user.persona,
        roles: userRoleNames,
        permissions,
        token_weblogin: user.tokenWeblogin,
      },
    };
  }

  async me(payload: JwtPayload): Promise<{
    id: number;
    email: string;
    roles: string[];
    permissions: string[];
  }> {
    const { roles: userRoleNames, permissions } =
      await this.loadRolesAndPermissions(payload.sub);
    return {
      id: payload.sub,
      email: payload.email ?? '',
      roles: userRoleNames,
      permissions,
    };
  }

  async logout(payload: JwtPayload): Promise<void> {
    if (!payload.jti || !payload.exp) return;
    await this.tokenRevocation.revokeForRemainingTtl(payload.jti, payload.exp);
  }

  private issueTokenPair(userId: number, email: string): TokenPair {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const jwtRefreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const { accessExpiresIn, refreshExpiresIn } = resolveJwtExpiresIn(
      this.configService,
      this.logger,
    );

    const accessToken = this.jwtService.sign(
      { sub: userId, email, jti: accessJti, type: 'access' } satisfies Omit<
        JwtPayload,
        'exp' | 'iat'
      >,
      {
        secret: jwtSecret,
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: refreshJti, type: 'refresh' } satisfies Omit<
        JwtPayload,
        'email' | 'exp' | 'iat'
      >,
      {
        secret: jwtRefreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    // Decode to get exp
    const decoded = jwt.decode(accessToken) as unknown as JwtPayload | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return { accessToken, refreshToken, expiresAt };
  }

  private async loadRolesAndPermissions(
    userId: number,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    try {
      // Roles
      const roleRows = await this.db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      // Permissions via roles
      const rolePermRows = await this.db
        .select({ name: permissions.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(eq(userRoles.userId, userId));

      // Direct user permissions
      const directPermRows = await this.db
        .select({ name: permissions.name })
        .from(userPermissions)
        .innerJoin(
          permissions,
          eq(userPermissions.permissionId, permissions.id),
        )
        .where(eq(userPermissions.userId, userId));

      return {
        roles: roleRows.map((r) => r.name),
        permissions: [
          ...new Set([
            ...rolePermRows.map((p) => p.name),
            ...directPermRows.map((p) => p.name),
          ]),
        ],
      };
    } catch (error) {
      this.logger.warn(
        `No se pudieron cargar roles/permisos para userId=${userId}; se devuelven listas vacias.`,
      );
      this.logger.debug(error);
      return { roles: [], permissions: [] };
    }
  }
}
