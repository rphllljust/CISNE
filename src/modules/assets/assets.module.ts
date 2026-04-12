import { Module } from '@nestjs/common';

import { AssetsService } from './application/services/assets.service';
import { AssetsController } from './presentation/controllers/assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService]
})
export class AssetsModule {}
