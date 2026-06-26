import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createAdminDrizzleClient } from './admin-db.client';
import { DRIZZLE_ADMIN } from './admin-db.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_ADMIN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const adminDatabaseUrl =
          configService.get<string>('ADMIN_DATABASE_URL');

        if (!adminDatabaseUrl) {
          throw new Error('ADMIN_DATABASE_URL is required');
        }

        return createAdminDrizzleClient(adminDatabaseUrl);
      },
    },
  ],
  exports: [DRIZZLE_ADMIN],
})
export class AdminDbModule {}
