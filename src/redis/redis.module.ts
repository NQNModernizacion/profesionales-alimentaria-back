import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        const logger = new Logger('RedisModule');

        const client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
        });

        client.on('connect', () => logger.log('Redis connected'));
        client.on('error', (err: Error) =>
          logger.error(`Redis error: ${err.message}`, err.stack),
        );

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
