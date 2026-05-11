import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Auth throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits brute force on forgot-password', async () => {
    const endpoint = '/api/v1/auth/forgot-password';
    const payload = { email: 'admin@oms.local' };

    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post(endpoint).send(payload).expect(200);
    }

    await request(app.getHttpServer()).post(endpoint).send(payload).expect(429);
  });
});
