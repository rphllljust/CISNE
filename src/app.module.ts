import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DocumentAutomationModule } from './modules/document-automation/document-automation.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { HealthModule } from './modules/health/health.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ItsmModule } from './modules/itsm/itsm.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PortalModule } from './modules/portal/portal.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env']
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL') ?? 'info',
          transport:
            configService.get<string>('NODE_ENV') === 'production'
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    ignore: 'pid,hostname'
                  }
                },
          customProps: () => ({
            context: 'http'
          })
        }
      })
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 120
      }
    ]),
    PrismaModule,
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    AssetsModule,
    SuppliersModule,
    ServiceOrdersModule,
    DispatchModule,
    InvoicesModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    KnowledgeBaseModule,
    ItsmModule,
    WebhooksModule,
    PortalModule,
    DocumentAutomationModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor
    }
  ]
})
export class AppModule {}
