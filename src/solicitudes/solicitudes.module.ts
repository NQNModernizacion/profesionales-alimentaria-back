import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { DrizzleSolicitudesRepository } from './repositories/drizzle-solicitudes.repository';
import { SOLICITUDES_REPOSITORY } from './solicitudes.tokens';

@Module({
  imports: [DbModule],
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    {
      provide: SOLICITUDES_REPOSITORY,
      useClass: DrizzleSolicitudesRepository,
    },
  ],
})
export class SolicitudesModule {}
