import { ConfigService } from '@nestjs/config';
import {
  JWT_EXTENDED_ACCESS,
  JWT_EXTENDED_REFRESH,
  JWT_INFINITE_TTL,
  normalizeJwtLifetimeProfile,
  resolveJwtExpiresIn,
} from './jwt-lifetime';

describe('jwt-lifetime', () => {
  describe('normalizeJwtLifetimeProfile', () => {
    it('accepts default, extended, infinite (case-insensitive)', () => {
      expect(normalizeJwtLifetimeProfile('DEFAULT')).toBe('default');
      expect(normalizeJwtLifetimeProfile(' Extended ')).toBe('extended');
      expect(normalizeJwtLifetimeProfile('INFINITE')).toBe('infinite');
    });

    it('falls back to default with warn on unknown', () => {
      const warn = jest.fn();
      expect(normalizeJwtLifetimeProfile('oops', { warn })).toBe('default');
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('resolveJwtExpiresIn', () => {
    it('default profile uses JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN', () => {
      const get = jest.fn((key: string, def?: string) => {
        if (key === 'JWT_LIFETIME_PROFILE') return 'default';
        if (key === 'JWT_EXPIRES_IN') return '1h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '14d';
        return def;
      });
      const config = { get } as unknown as ConfigService;

      const out = resolveJwtExpiresIn(config);
      expect(out.profile).toBe('default');
      expect(out.accessExpiresIn).toBe('1h');
      expect(out.refreshExpiresIn).toBe('14d');
    });

    it('extended profile uses fixed long TTLs', () => {
      const get = jest.fn((key: string) => {
        if (key === 'JWT_LIFETIME_PROFILE') return 'extended';
        return undefined;
      });
      const config = { get } as unknown as ConfigService;

      const out = resolveJwtExpiresIn(config);
      expect(out.profile).toBe('extended');
      expect(out.accessExpiresIn).toBe(JWT_EXTENDED_ACCESS);
      expect(out.refreshExpiresIn).toBe(JWT_EXTENDED_REFRESH);
    });

    it('infinite profile uses very long TTL for both', () => {
      const get = jest.fn((key: string) => {
        if (key === 'JWT_LIFETIME_PROFILE') return 'infinite';
        return undefined;
      });
      const config = { get } as unknown as ConfigService;

      const out = resolveJwtExpiresIn(config);
      expect(out.profile).toBe('infinite');
      expect(out.accessExpiresIn).toBe(JWT_INFINITE_TTL);
      expect(out.refreshExpiresIn).toBe(JWT_INFINITE_TTL);
    });
  });
});
