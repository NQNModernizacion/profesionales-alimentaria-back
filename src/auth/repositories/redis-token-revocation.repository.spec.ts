import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { RedisTokenRevocationRepository } from './redis-token-revocation.repository';

describe('RedisTokenRevocationRepository', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  let repo: RedisTokenRevocationRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisTokenRevocationRepository,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    repo = module.get(RedisTokenRevocationRepository);
  });

  it('isRevoked returns true when key exists', async () => {
    redis.get.mockResolvedValue('1');
    await expect(repo.isRevoked('abc')).resolves.toBe(true);
    expect(redis.get).toHaveBeenCalledWith('jti:abc');
  });

  it('revokeForRemainingTtl sets key with EX when ttl positive', async () => {
    const exp = Math.floor(Date.now() / 1000) + 10;
    await repo.revokeForRemainingTtl('j1', exp);
    expect(redis.set).toHaveBeenCalledWith(
      'jti:j1',
      '1',
      'EX',
      expect.any(Number),
    );
  });

  it('revokeForRemainingTtl skips set when no ttl left', async () => {
    await repo.revokeForRemainingTtl('j1', Math.floor(Date.now() / 1000) - 10);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
