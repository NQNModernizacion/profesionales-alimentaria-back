import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDrizzleClient } from './db.client';
import { DRIZZLE } from './db.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }

        return createDrizzleClient(databaseUrl);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule {}
