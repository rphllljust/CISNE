import { Body, Controller, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  DispatchRecommendationQueryDto,
  OptimizeRouteDto,
  UpdateTechnicianLocationDto
} from '../../application/dto/dispatch.dto';
import { DispatchService } from '../../application/services/dispatch.service';

@ApiTags('Dispatch')
@ApiBearerAuth()
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('technicians/:id/location')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Atualiza a localizacao atual do tecnico' })
  async updateTechnicianLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTechnicianLocationDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.dispatchService.updateTechnicianLocation(id, dto, actor);
  }

  @Post('service-orders/:id/recommendations')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Sugere tecnicos por skill, carga e proximidade' })
  async recommendTechnicians(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DispatchRecommendationQueryDto
  ): Promise<unknown> {
    return this.dispatchService.recommendTechnicians(id, query.requiredSkill);
  }

  @Post('routes/optimize')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Otimiza sequencia de atendimento para conjunto de OSs' })
  async optimizeRoute(@Body() dto: OptimizeRouteDto): Promise<unknown> {
    return this.dispatchService.optimizeRoute(dto);
  }
}
