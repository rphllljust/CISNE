import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateChangeRequestDto,
  CreateProblemRecordDto,
  ItsmMetricsQueryDto,
  ListChangeRequestsQueryDto,
  ListProblemRecordsQueryDto,
  UpdateChangeRequestDto,
  UpdateProblemRecordDto
} from '../../application/dto/itsm.dto';
import { ItsmService } from '../../application/services/itsm.service';

@ApiTags('ITSM')
@ApiBearerAuth()
@Controller('itsm')
export class ItsmController {
  constructor(private readonly itsmService: ItsmService) {}

  @Post('problems')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Registra problema (RCA/known error)' })
  async createProblem(
    @Body() dto: CreateProblemRecordDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.itsmService.createProblem(dto, actor);
  }

  @Get('problems')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista problemas com filtros operacionais' })
  async listProblems(@Query() query: ListProblemRecordsQueryDto): Promise<unknown> {
    return this.itsmService.listProblems(query);
  }

  @Get('problems/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Detalha problema' })
  async findProblemById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.itsmService.findProblemById(id);
  }

  @Patch('problems/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualiza problema e progresso de RCA' })
  async updateProblem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProblemRecordDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.itsmService.updateProblem(id, dto, actor);
  }

  @Post('changes')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Registra requisicao de mudanca' })
  async createChange(
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.itsmService.createChange(dto, actor);
  }

  @Get('changes')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista mudancas com filtros' })
  async listChanges(@Query() query: ListChangeRequestsQueryDto): Promise<unknown> {
    return this.itsmService.listChanges(query);
  }

  @Get('changes/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Detalha mudanca' })
  async findChangeById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.itsmService.findChangeById(id);
  }

  @Patch('changes/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualiza mudanca (aprovacao, execucao, review)' })
  async updateChange(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangeRequestDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.itsmService.updateChange(id, dto, actor);
  }

  @Get('metrics')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Indicadores consolidados de problemas e mudancas' })
  async metrics(@Query() query: ItsmMetricsQueryDto): Promise<unknown> {
    return this.itsmService.metrics(query);
  }
}
