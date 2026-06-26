import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { TokenRevocationRepository } from './token-revocation.repository';

@Injectable()
export class RedisTokenRevocationRepository implements TokenRevocationRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async isRevoked(jti: string): Promise<boolean> {
    const v = await this.redis.get(`jti:${jti}`);
    return Boolean(v);
  }

  async revokeForRemainingTtl(
    jti: string,
    expUnixSeconds: number | undefined,
  ): Promise<void> {
    const remainingTtl = Math.max(
      0,
      (expUnixSeconds ?? 0) - Math.floor(Date.now() / 1000),
    );
    if (remainingTtl > 0) {
      await this.redis.set(`jti:${jti}`, '1', 'EX', remainingTtl);
    }
  }
}
