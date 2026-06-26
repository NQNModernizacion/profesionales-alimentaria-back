import type { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

export const JWT_LIFETIME_PROFILE_VALUES = [
  'default',
  'extended',
  'infinite',
] as const;

export type JwtLifetimeProfile = (typeof JWT_LIFETIME_PROFILE_VALUES)[number];

/** Fixed long TTLs when profile is `extended` (access + refresh). */
export const JWT_EXTENDED_ACCESS = '24h';
export const JWT_EXTENDED_REFRESH = '90d';

/** Practical "no expiry" for Passport + Redis JTI TTL (both tokens). */
export const JWT_INFINITE_TTL = '100y';

export function normalizeJwtLifetimeProfile(
  raw: string | undefined,
  logger?: Pick<Logger, 'warn'>,
): JwtLifetimeProfile {
  const n = (raw ?? 'default').trim().toLowerCase();
  if (n === 'default' || n === 'extended' || n === 'infinite') {
    return n;
  }
  logger?.warn(
    `JWT_LIFETIME_PROFILE desconocido "${raw ?? ''}", usando "default"`,
  );
  return 'default';
}

/**
 * Resolves access/refresh `expiresIn` for `JwtService.sign` from `JWT_LIFETIME_PROFILE`.
 * - `default`: uses `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` (same as before this feature).
 * - `extended` / `infinite`: overrides both with preset durations.
 */
export function resolveJwtExpiresIn(
  configService: ConfigService,
  logger?: Pick<Logger, 'warn'>,
): {
  profile: JwtLifetimeProfile;
  accessExpiresIn: SignOptions['expiresIn'];
  refreshExpiresIn: SignOptions['expiresIn'];
} {
  const profile = normalizeJwtLifetimeProfile(
    configService.get<string>('JWT_LIFETIME_PROFILE'),
    logger,
  );

  if (profile === 'default') {
    return {
      profile,
      accessExpiresIn: configService.get<string>(
        'JWT_EXPIRES_IN',
        '15m',
      ) as NonNullable<SignOptions['expiresIn']>,
      refreshExpiresIn: configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as NonNullable<SignOptions['expiresIn']>,
    };
  }

  if (profile === 'extended') {
    return {
      profile,
      accessExpiresIn: JWT_EXTENDED_ACCESS as NonNullable<
        SignOptions['expiresIn']
      >,
      refreshExpiresIn: JWT_EXTENDED_REFRESH as NonNullable<
        SignOptions['expiresIn']
      >,
    };
  }

  return {
    profile,
    accessExpiresIn: JWT_INFINITE_TTL as NonNullable<SignOptions['expiresIn']>,
    refreshExpiresIn: JWT_INFINITE_TTL as NonNullable<SignOptions['expiresIn']>,
  };
}
