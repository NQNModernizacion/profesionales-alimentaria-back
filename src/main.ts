import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS - allows requests from the frontend
  // Note: 'http://localhost:*' is NOT valid - CORS compares exact origin strings.
  // Use comma-separated list in CORS_ORIGIN for production (e.g. https://myapp.railway.app).
  // Browser sends Origin without path (e.g. https://example.com), so we normalize by stripping trailing slash.
  const originsEnv = process.env.CORS_ORIGIN?.trim();
  const origins = originsEnv
    ? originsEnv
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    : ['http://localhost:3001'];

  const corsOptions = {
    origin: origins,
    credentials: true,
  };
  app.enableCors(corsOptions);

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Profesionales Alimentaria API')
      .setDescription('Documentación de endpoints del template NestJS.')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
