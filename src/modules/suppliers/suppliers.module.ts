import { Module } from '@nestjs/common';

import { SuppliersService } from './application/services/suppliers.service';
import { SuppliersController } from './presentation/controllers/suppliers.controller';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService]
})
export class SuppliersModule {}
