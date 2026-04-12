import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { EnvConfig } from './config/env.validation';

function normalizeCorsOrigins(rawCorsOrigin: string): string | string[] {
  const normalized = rawCorsOrigin.trim();
  if (normalized === '*') {
    return '*';
  }

  const originList = normalized
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (originList.length === 0) {
    return '*';
  }

  return originList.length === 1 ? originList[0] : originList;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get<ConfigService<EnvConfig>>(ConfigService);
  const httpAdapter = app.getHttpAdapter().getInstance();

  app.enableShutdownHooks();

  app.useLogger(app.get(Logger));
  app.use(helmet());
  if (configService.get('TRUST_PROXY', { infer: true })) {
    httpAdapter.set('trust proxy', 1);
  }

  app.enableCors({
    origin: normalizeCorsOrigins(configService.get('CORS_ORIGIN', { infer: true }) ?? '*'),
    credentials: true
  });

  app.setGlobalPrefix(configService.get('API_PREFIX', { infer: true }) ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OMS API')
    .setDescription('API de Operations Management System')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none'
    }
  });

  const port = configService.get('PORT', { infer: true }) ?? 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
