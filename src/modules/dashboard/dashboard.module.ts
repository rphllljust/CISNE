import { Module } from '@nestjs/common';

import { DashboardService } from './application/services/dashboard.service';
import { DashboardController } from './presentation/controllers/dashboard.controller';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
