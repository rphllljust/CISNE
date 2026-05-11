import { Module } from '@nestjs/common';

import { OperationsToolsService } from './application/services/operations-tools.service';
import { OperationsToolsController } from './presentation/controllers/operations-tools.controller';

@Module({
  controllers: [OperationsToolsController],
  providers: [OperationsToolsService],
  exports: [OperationsToolsService]
})
export class OperationsToolsModule {}
