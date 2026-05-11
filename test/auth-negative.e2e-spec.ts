import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Auth negative (e2e)', () => {
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

  it('rejects login with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@oms.local', password: 'SenhaErrada@123' })
      .expect(401);
  });

  it('rejects login for non-existent user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'naoexiste@dominio.local', password: 'Strong@123456' })
      .expect(401);
  });

  it('rejects login with invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalido', password: '123' })
      .expect(400);
  });

  it('rejects refresh with invalid token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalido.token' })
      .expect(401);
  });

  it('rejects protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('rejects protected route with malformed token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer token-malformado')
      .expect(401);
  });
});
