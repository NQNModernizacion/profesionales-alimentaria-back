import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthIdentityService } from '../services/auth-identity.service';
import { InternalStrategy } from './internal.strategy';

describe('InternalStrategy', () => {
  const authIdentity = {
    isEmail: jest.fn(),
    authenticateByEmail: jest.fn(),
    authenticateByDocumento: jest.fn(),
  };

  let strategy: InternalStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalStrategy,
        { provide: AuthIdentityService, useValue: authIdentity },
      ],
    }).compile();

    strategy = module.get(InternalStrategy);
  });

  it('throws when _id is missing', async () => {
    await expect(strategy.authenticate({})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('routes to email authentication', async () => {
    authIdentity.isEmail.mockReturnValue(true);
    authIdentity.authenticateByEmail.mockResolvedValue({
      id: 1,
      email: 'a@b.com',
      password: 'x',
    });

    const u = await strategy.authenticate({ _id: 'a@b.com' });
    expect(authIdentity.authenticateByEmail).toHaveBeenCalledWith('a@b.com');
    expect(u.id).toBe(1);
  });

  it('routes to document authentication', async () => {
    authIdentity.isEmail.mockReturnValue(false);
    authIdentity.authenticateByDocumento.mockResolvedValue({
      id: 2,
      email: 'documento_1@local',
      password: 'p',
    });

    const u = await strategy.authenticate({ _id: '123' });
    expect(authIdentity.authenticateByDocumento).toHaveBeenCalledWith('123');
    expect(u.id).toBe(2);
  });
});
