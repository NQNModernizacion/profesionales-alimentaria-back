import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AdminDbModule } from '../admin-db/admin-db.module';
import { RedisModule } from '../redis/redis.module';
import { DbModule } from '../db/db.module';
import { CaslModule } from './casl/casl.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  ADMIN_IDENTITY_REPOSITORY,
  TOKEN_REVOCATION_REPOSITORY,
} from './auth.tokens';
import { DrizzleAdminIdentityRepository } from './repositories/drizzle-admin-identity.repository';
import { RedisTokenRevocationRepository } from './repositories/redis-token-revocation.repository';
import { AuthIdentityService } from './services/auth-identity.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthStrategyResolver } from './strategies/auth-strategy.resolver';
import { InternalStrategy } from './strategies/internal.strategy';
import { EnterAppStrategy } from './strategies/enter-app.strategy';
import { TokenRefreshStrategy } from './strategies/token-refresh.strategy';
import { JwtPassportStrategy } from './passport/jwt.passport-strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    AdminDbModule,
    RedisModule,
    DbModule,
    CaslModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Intentionally empty — secrets are passed per-call in options
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthIdentityService,
    RefreshTokenService,
    {
      provide: ADMIN_IDENTITY_REPOSITORY,
      useClass: DrizzleAdminIdentityRepository,
    },
    {
      provide: TOKEN_REVOCATION_REPOSITORY,
      useClass: RedisTokenRevocationRepository,
    },
    AuthStrategyResolver,
    InternalStrategy,
    EnterAppStrategy,
    TokenRefreshStrategy,
    JwtPassportStrategy,
    RolesGuard,
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
