import { Module } from '@nestjs/common';

import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';

import { PortalService } from './application/services/portal.service';
import { PortalController } from './presentation/controllers/portal.controller';

@Module({
  imports: [ServiceOrdersModule, KnowledgeBaseModule],
  controllers: [PortalController],
  providers: [PortalService]
})
export class PortalModule {}
