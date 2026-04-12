import { Module } from '@nestjs/common';

import { WebhooksService } from './application/services/webhooks.service';
import { WebhooksController } from './presentation/controllers/webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService]
})
export class WebhooksModule {}
