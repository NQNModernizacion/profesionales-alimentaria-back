import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { TOKEN_REVOCATION_REPOSITORY } from '../auth.tokens';
import { RefreshTokenService } from './refresh-token.service';

jest.mock('jsonwebtoken');

describe('RefreshTokenService', () => {
  const revocation = {
    isRevoked: jest.fn(),
    revokeForRemainingTtl: jest.fn(),
  };

  let service: RefreshTokenService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    config = { get: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: ConfigService, useValue: config },
        { provide: TOKEN_REVOCATION_REPOSITORY, useValue: revocation },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('throws when Authorization header is missing', async () => {
    await expect(
      service.validateAndConsumeRefresh({
        headers: {},
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when JWT_REFRESH_SECRET is not set', async () => {
    config.get.mockReturnValue(undefined);
    await expect(
      service.validateAndConsumeRefresh({
        headers: { authorization: 'Bearer x' },
      } as never),
    ).rejects.toThrow('JWT_REFRESH_SECRET no configurado');
  });

  it('throws when token is not refresh type', async () => {
    config.get.mockReturnValue('secret');
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 1,
      jti: 'j',
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    await expect(
      service.validateAndConsumeRefresh({
        headers: { authorization: 'Bearer tok' },
      } as never),
    ).rejects.toThrow('Token no es de tipo refresh');
  });

  it('throws when jti is revoked', async () => {
    config.get.mockReturnValue('secret');
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 1,
      jti: 'jti-1',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    revocation.isRevoked.mockResolvedValue(true);

    await expect(
      service.validateAndConsumeRefresh({
        headers: { authorization: 'Bearer tok' },
      } as never),
    ).rejects.toThrow('Token ya ha sido revocado');
  });

  it('revokes jti and returns payload on success', async () => {
    config.get.mockReturnValue('secret');
    const payload = {
      sub: 9,
      jti: 'jti-2',
      type: 'refresh' as const,
      exp: Math.floor(Date.now() / 1000) + 120,
    };
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    revocation.isRevoked.mockResolvedValue(false);

    const out = await service.validateAndConsumeRefresh({
      headers: { authorization: 'Bearer tok' },
    } as never);

    expect(out.sub).toBe(9);
    expect(revocation.revokeForRemainingTtl).toHaveBeenCalledWith(
      'jti-2',
      payload.exp,
    );
  });
});
