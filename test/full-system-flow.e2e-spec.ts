import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Full System Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true }
      })
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await app.close();
  });

  it('executes end-to-end integration flow', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@oms.local',
        password: 'Admin@123'
      })
      .expect(200);

    expect(loginResponse.body.accessToken).toBeDefined();
    const authHeader = `Bearer ${String(loginResponse.body.accessToken)}`;

    const unique = Date.now().toString();
    const taxId = `9900112200${unique.slice(-4)}`;

    const createClientResponse = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', authHeader)
      .send({
        type: 'BUSINESS',
        name: `Cliente E2E ${unique}`,
        legalName: `Cliente E2E ${unique} LTDA`,
        taxId,
        email: `cliente-e2e-${unique}@demo.local`,
        phone: '65999123456',
        contactName: 'E2E Manager',
        addresses: [
          {
            label: 'Matriz',
            street: 'Rua Teste',
            number: '100',
            district: 'Centro',
            city: 'Cuiaba',
            state: 'MT',
            zipCode: '78000000',
            isPrimary: true
          }
        ]
      })
      .expect(201);

    expect(createClientResponse.body.id).toBeDefined();
    const clientId = String(createClientResponse.body.id);

    const [serviceType, team, technician] = await Promise.all([
      prisma.serviceType.findFirst({
        where: { active: true },
        select: { id: true }
      }),
      prisma.team.findFirst({
        where: { active: true },
        select: { id: true }
      }),
      prisma.user.findFirst({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true }
      })
    ]);

    expect(serviceType).not.toBeNull();
    expect(team).not.toBeNull();
    expect(technician).not.toBeNull();

    const scheduledStartAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduledEndAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const createOrderResponse = await request(app.getHttpServer())
      .post('/api/v1/service-orders')
      .set('Authorization', authHeader)
      .send({
        clientId,
        serviceTypeId: serviceType?.id,
        assignedTeamId: team?.id,
        assignedTechnicianId: technician?.id,
        title: `OS E2E ${unique}`,
        description: 'Fluxo completo de integracao',
        priority: 'HIGH',
        scheduledStartAt,
        scheduledEndAt
      })
      .expect(201);

    const serviceOrderId = String(createOrderResponse.body.id);
    expect(serviceOrderId).toBeTruthy();

    const transitionSteps = ['IN_TRANSIT', 'IN_PROGRESS'];
    for (const step of transitionSteps) {
      await request(app.getHttpServer())
        .post(`/api/v1/service-orders/${serviceOrderId}/transition-status`)
        .set('Authorization', authHeader)
        .send({
          toStatus: step,
          reason: `E2E transition ${step}`
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/service-orders/${serviceOrderId}/check-in`)
      .set('Authorization', authHeader)
      .send({ at: new Date().toISOString() })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/service-orders/${serviceOrderId}/check-out`)
      .set('Authorization', authHeader)
      .send({ at: new Date().toISOString() })
      .expect(201);

    const serviceOrderDetailResponse = await request(app.getHttpServer())
      .get(`/api/v1/service-orders/${serviceOrderId}`)
      .set('Authorization', authHeader)
      .expect(200);

    expect(serviceOrderDetailResponse.body.status).toBe('COMPLETED');

    const emitInvoiceResponse = await request(app.getHttpServer())
      .post('/api/v1/invoices/emit')
      .set('Authorization', authHeader)
      .send({
        serviceOrderId,
        grossAmount: 2500,
        discountAmount: 100,
        taxAmount: 300,
        description: 'E2E invoice'
      })
      .expect(201);

    expect(emitInvoiceResponse.body.id).toBeDefined();
    expect(emitInvoiceResponse.body.status).toBe('ISSUED');

    const invoiceId = String(emitInvoiceResponse.body.id);
    await request(app.getHttpServer())
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/invoices?page=1&limit=20')
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/basic/triage-score')
      .set('Authorization', authHeader)
      .send({
        impact: 4,
        urgency: 5,
        effortHours: 6
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/basic/checklist-template')
      .set('Authorization', authHeader)
      .send({
        serviceCategory: 'PREVENTIVE'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/intermediate/sla-plan')
      .set('Authorization', authHeader)
      .send({
        openedAt: new Date().toISOString(),
        responseTargetHours: 4,
        resolutionTargetHours: 24
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/intermediate/workload-balancing')
      .set('Authorization', authHeader)
      .send({
        technicians: [
          {
            id: 'tech-1',
            name: 'Tech 1',
            skills: ['network'],
            currentLoadHours: 8,
            weeklyCapacityHours: 40
          }
        ],
        workOrders: [
          {
            id: 'os-1',
            requiredSkills: ['network'],
            estimatedHours: 6,
            priority: 5
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/advanced/route-plan')
      .set('Authorization', authHeader)
      .send({
        startLatitude: -15.601,
        startLongitude: -56.097,
        averageSpeedKmh: 35,
        stops: [{ id: 'os-1', latitude: -15.602, longitude: -56.098, serviceMinutes: 30 }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/operations-tools/advanced/risk-estimation')
      .set('Authorization', authHeader)
      .send({
        backlogSize: 20,
        overdueCount: 4,
        avgResolutionHours: 18,
        reopenRatePercent: 8,
        firstTimeFixRatePercent: 82,
        teamAvailabilityPercent: 76
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/overview')
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/reports/dashboard')
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/notifications/me')
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/audit-logs?page=1&limit=20')
      .set('Authorization', authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/service-orders/${serviceOrderId}/context`)
      .set('Authorization', authHeader)
      .expect(200);
  });
});
