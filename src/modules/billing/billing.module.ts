import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurringBillingService } from './application/services/recurring-billing.service';
import { NfseModule } from '@/modules/nfse/nfse.module';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NfseModule,
    AuditModule
  ],
  providers: [RecurringBillingService],
  exports: [RecurringBillingService]
})
export class BillingModule {}
