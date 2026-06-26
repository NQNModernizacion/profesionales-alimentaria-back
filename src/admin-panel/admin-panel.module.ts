import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AdminDbModule } from '../admin-db/admin-db.module';
import { AuthModule } from '../auth/auth.module';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelService } from './admin-panel.service';
import { DrizzleAdminPanelRepository } from './repositories/drizzle-admin-panel.repository';
import { ADMIN_PANEL_REPOSITORY } from './admin-panel.tokens';

@Module({
  imports: [DbModule, AdminDbModule, AuthModule],
  controllers: [AdminPanelController],
  providers: [
    AdminPanelService,
    {
      provide: ADMIN_PANEL_REPOSITORY,
      useClass: DrizzleAdminPanelRepository,
    },
  ],
})
export class AdminPanelModule {}
