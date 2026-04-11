import { Module } from '@nestjs/common';

import { REPOSITORY_TOKENS } from '../../common/constants/injection-tokens';
import { NotificationsModule } from '../notifications/notifications.module';

import { ServiceOrdersService } from './application/services/service-orders.service';
import { TransitionServiceOrderStatusUseCase } from './application/use-cases/transition-service-order-status.use-case';
import { ServiceOrderStatusPolicy } from './domain/services/service-order-status-policy.service';
import { PrismaServiceOrdersRepository } from './infrastructure/repositories/prisma-service-orders.repository';
import { ServiceOrdersController } from './presentation/controllers/service-orders.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [ServiceOrdersController],
  providers: [
    ServiceOrdersService,
    TransitionServiceOrderStatusUseCase,
    ServiceOrderStatusPolicy,
    {
      provide: REPOSITORY_TOKENS.SERVICE_ORDERS_REPOSITORY,
      useClass: PrismaServiceOrdersRepository
    }
  ],
  exports: [ServiceOrdersService]
})
export class ServiceOrdersModule {}
