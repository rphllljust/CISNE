import { Module } from '@nestjs/common';

import { ItsmService } from './application/services/itsm.service';
import { ItsmController } from './presentation/controllers/itsm.controller';

@Module({
  controllers: [ItsmController],
  providers: [ItsmService],
  exports: [ItsmService]
})
export class ItsmModule {}
