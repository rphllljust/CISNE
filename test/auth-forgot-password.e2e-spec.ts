import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Auth Forgot Password (e2e)', () => {
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

  it('never returns reset token for known email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'admin@oms.local' })
      .expect(200);

    expect(response.body.message).toBe('Se o e-mail existir, enviaremos instrucoes de recuperacao.');
    expect(JSON.stringify(response.body)).not.toContain('token');
  });

  it('returns same generic message for unknown email', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'naoexiste@dominio.local' })
      .expect(200);

    expect(response.body.message).toBe('Se o e-mail existir, enviaremos instrucoes de recuperacao.');
    expect(JSON.stringify(response.body)).not.toContain('token');
  });
});
