import { Module } from '@nestjs/common';

import { NotificationsService } from './application/services/notifications.service';
import { NotificationsController } from './presentation/controllers/notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
