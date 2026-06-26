import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthIdentityService } from '../services/auth-identity.service';
import { EnterAppStrategy } from './enter-app.strategy';

describe('EnterAppStrategy', () => {
  const authIdentity = {
    loadAdminUserById: jest.fn(),
  };

  let strategy: EnterAppStrategy;
  const originalSecret = process.env['INTERNAL_SECRET'];

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env['INTERNAL_SECRET'] = 'secret';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterAppStrategy,
        { provide: AuthIdentityService, useValue: authIdentity },
      ],
    }).compile();

    strategy = module.get(EnterAppStrategy);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env['INTERNAL_SECRET'];
    } else {
      process.env['INTERNAL_SECRET'] = originalSecret;
    }
  });

  it('throws when INTERNAL_SECRET is not configured', async () => {
    delete process.env['INTERNAL_SECRET'];
    await expect(
      strategy.authenticate({ _id: '1' }, { headers: {} } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when x-internal-secret is wrong', async () => {
    await expect(
      strategy.authenticate({ _id: '1' }, {
        headers: { 'x-internal-secret': 'bad' },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws BadRequest when _id is missing', async () => {
    await expect(
      strategy.authenticate({}, {
        headers: { 'x-internal-secret': 'secret' },
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when _id is not an integer', async () => {
    await expect(
      strategy.authenticate({ _id: 'x' }, {
        headers: { 'x-internal-secret': 'secret' },
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('loads user when secret and id are valid', async () => {
    authIdentity.loadAdminUserById.mockResolvedValue({
      id: 9,
      email: 'a@b.com',
      password: 'p',
    });

    const u = await strategy.authenticate({ _id: '9' }, {
      headers: { 'x-internal-secret': 'secret' },
    } as never);

    expect(authIdentity.loadAdminUserById).toHaveBeenCalledWith(9);
    expect(u.id).toBe(9);
  });
});
