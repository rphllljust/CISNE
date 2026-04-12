import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

import { AutomationMetricsService } from './application/services/automation-metrics.service';
import { BudgetApprovalService } from './application/services/budget-approval.service';
import { DocumentExtractionService } from './application/services/document-extraction.service';
import { DocumentAutomationController } from './presentation/controllers/document-automation.controller';

@Module({
  imports: [NotificationsModule, WebhooksModule],
  controllers: [DocumentAutomationController],
  providers: [DocumentExtractionService, BudgetApprovalService, AutomationMetricsService],
  exports: [DocumentExtractionService, AutomationMetricsService]
})
export class DocumentAutomationModule {}
