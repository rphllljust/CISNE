import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../../common/decorators/roles.decorator';
import { DashboardFilterDto } from '../../application/services/dashboard-filter.dto';
import { DashboardService } from '../../application/services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Indicadores operacionais em tempo real' })
  async overview(@Query() query: DashboardFilterDto): Promise<Record<string, unknown>> {
    return this.dashboardService.getOverview(query);
  }
}
