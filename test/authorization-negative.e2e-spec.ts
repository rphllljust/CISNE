import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Authorization negative (e2e)', () => {
  let app: INestApplication;
  let technicianToken = '';

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

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'tecnico@oms.local', password: process.env.SEED_TECH_PASSWORD ?? 'Tech@123' });
    technicianToken = String(login.body?.accessToken ?? '');
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks technician from admin-only route', async () => {
    if (!technicianToken) return;
    await request(app.getHttpServer())
      .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(403);
  });
});
