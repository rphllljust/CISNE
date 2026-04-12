import { Module } from '@nestjs/common';

import { InvoicesService } from './application/services/invoices.service';
import { InvoicesController } from './presentation/controllers/invoices.controller';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService]
})
export class InvoicesModule {}
