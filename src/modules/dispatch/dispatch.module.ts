import { Module } from '@nestjs/common';

import { DispatchService } from './application/services/dispatch.service';
import { DispatchController } from './presentation/controllers/dispatch.controller';

@Module({
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService]
})
export class DispatchModule {}
