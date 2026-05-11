import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ChecklistTemplateInputDto,
  RiskEstimationInputDto,
  RoutePlanInputDto,
  SlaPlanInputDto,
  TriageScoreInputDto,
  WorkloadBalancingInputDto
} from '../../application/dto/operations-tools.dto';
import { OperationsToolsService } from '../../application/services/operations-tools.service';

@ApiTags('Operations Tools')
@ApiBearerAuth()
@Controller('operations-tools')
export class OperationsToolsController {
  constructor(private readonly operationsToolsService: OperationsToolsService) {}

  @Post('basic/triage-score')
  @ApiOperation({ summary: 'Ferramenta basica: score de triagem e prioridade sugerida' })
  triageScore(@Body() dto: TriageScoreInputDto): Record<string, unknown> {
    return this.operationsToolsService.triageScore(dto);
  }

  @Post('basic/checklist-template')
  @ApiOperation({ summary: 'Ferramenta basica: checklist padrao por categoria de servico' })
  checklistTemplate(@Body() dto: ChecklistTemplateInputDto): Record<string, unknown> {
    return this.operationsToolsService.checklistTemplate(dto);
  }

  @Post('intermediate/sla-plan')
  @ApiOperation({ summary: 'Ferramenta intermediaria: plano de marcos de SLA' })
  slaPlan(@Body() dto: SlaPlanInputDto): Record<string, unknown> {
    return this.operationsToolsService.slaPlan(dto);
  }

  @Post('intermediate/workload-balancing')
  @ApiOperation({ summary: 'Ferramenta intermediaria: distribuicao de carga entre tecnicos' })
  workloadBalancing(@Body() dto: WorkloadBalancingInputDto): Record<string, unknown> {
    return this.operationsToolsService.workloadBalancing(dto);
  }

  @Post('advanced/route-plan')
  @ApiOperation({ summary: 'Ferramenta avancada: roteirizacao de atendimento em campo' })
  routePlan(@Body() dto: RoutePlanInputDto): Record<string, unknown> {
    return this.operationsToolsService.routePlan(dto);
  }

  @Post('advanced/risk-estimation')
  @ApiOperation({ summary: 'Ferramenta avancada: estimativa de risco operacional' })
  riskEstimation(@Body() dto: RiskEstimationInputDto): Record<string, unknown> {
    return this.operationsToolsService.riskEstimation(dto);
  }
}
