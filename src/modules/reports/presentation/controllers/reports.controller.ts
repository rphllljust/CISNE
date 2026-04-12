import { Controller, Get, Header, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../../common/decorators/roles.decorator';
import { ReportsFilterDto } from '../../application/dto/reports.dto';
import { ReportsService } from '../../application/services/reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Dashboard operacional consolidado com KPIs' })
  async dashboard(@Query() query: ReportsFilterDto): Promise<unknown> {
    return this.reportsService.dashboard(query);
  }

  @Get('technicians/:id/efficiency')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Eficiência operacional de técnico por período' })
  async technicianEfficiency(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ReportsFilterDto
  ): Promise<unknown> {
    return this.reportsService.technicianEfficiency(id, query);
  }

  @Get('service-orders/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Exporta ordens de serviço em CSV' })
  async exportServiceOrdersCsv(@Query() query: ReportsFilterDto): Promise<string> {
    return this.reportsService.exportServiceOrdersCsv(query);
  }
}
