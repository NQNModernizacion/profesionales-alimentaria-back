import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AbsoluteUrlInterceptor } from './interceptors/absolute-url.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { RedisModule } from './redis/redis.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AdminPanelModule } from './admin-panel/admin-panel.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    RedisModule,
    AuthModule,
    AdminPanelModule,
    SolicitudesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AbsoluteUrlInterceptor,
    },
  ],
})
export class AppModule {}
