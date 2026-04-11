import { Global, Module } from '@nestjs/common';

import { AuditService } from './application/services/audit.service';
import { AuditController } from './presentation/controllers/audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
