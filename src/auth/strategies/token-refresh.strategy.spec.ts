import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthIdentityService } from '../services/auth-identity.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { TokenRefreshStrategy } from './token-refresh.strategy';

describe('TokenRefreshStrategy', () => {
  const refreshToken = {
    validateAndConsumeRefresh: jest.fn(),
  };
  const authIdentity = {
    loadAdminUserById: jest.fn(),
  };

  let strategy: TokenRefreshStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshStrategy,
        { provide: RefreshTokenService, useValue: refreshToken },
        { provide: AuthIdentityService, useValue: authIdentity },
      ],
    }).compile();

    strategy = module.get(TokenRefreshStrategy);
  });

  it('throws when request is missing', async () => {
    await expect(strategy.authenticate({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('loads user after refresh validation', async () => {
    refreshToken.validateAndConsumeRefresh.mockResolvedValue({ sub: 5 });
    authIdentity.loadAdminUserById.mockResolvedValue({
      id: 5,
      email: 'a@b.com',
      password: 'p',
    });

    const u = await strategy.authenticate({}, {
      headers: { authorization: 'Bearer x' },
    } as never);

    expect(refreshToken.validateAndConsumeRefresh).toHaveBeenCalled();
    expect(authIdentity.loadAdminUserById).toHaveBeenCalledWith(
      5,
      'Usuario con ID 5 no encontrado',
    );
    expect(u.id).toBe(5);
  });
});
