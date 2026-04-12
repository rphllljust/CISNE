import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceOrderStatus } from '@prisma/client';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { CreateServiceOrderDto } from '../../application/dto/create-service-order.dto';
import { FieldCheckDto } from '../../application/dto/field-check.dto';
import { ListServiceOrdersQueryDto } from '../../application/dto/list-service-orders-query.dto';
import { ScheduleServiceOrderDto } from '../../application/dto/schedule-service-order.dto';
import {
  CreateServiceOrderClassificationRuleDto,
  CreateServiceOrderTemplateDto,
  CreateWorkflowTransitionDto,
  ListDynamicFieldSchemaQueryDto,
  ListServiceOrderClassificationRuleQueryDto,
  ListServiceOrderTemplateQueryDto,
  ListWorkflowTransitionQueryDto,
  UpsertDynamicFieldSchemaDto
} from '../../application/dto/service-order-config.dto';
import { TransitionServiceOrderStatusDto } from '../../application/dto/transition-service-order-status.dto';
import { UpdateServiceOrderDto } from '../../application/dto/update-service-order.dto';
import { ServiceOrdersService } from '../../application/services/service-orders.service';

@ApiTags('Service Orders')
@ApiBearerAuth()
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Cria nova ordem de servico' })
  async create(
    @Body() dto: CreateServiceOrderDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.create(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT', 'CLIENT')
  @ApiOperation({ summary: 'Lista ordens de servico com filtros e paginacao' })
  async findAll(@Query() query: ListServiceOrdersQueryDto): Promise<unknown> {
    return this.serviceOrdersService.findAll(query);
  }

  @Get('meta/allowed-transitions/:status')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Consulta transicoes permitidas para um status atual' })
  async getAllowedTransitions(
    @Param('status', new ParseEnumPipe(ServiceOrderStatus)) status: ServiceOrderStatus,
    @Query('serviceTypeId') serviceTypeId?: string
  ): Promise<{
    status: ServiceOrderStatus;
    serviceTypeId?: string;
    allowedTransitions: ServiceOrderStatus[];
    actions: Array<{
      fromStatus: ServiceOrderStatus;
      toStatus: ServiceOrderStatus;
      actionLabel: string;
      autoAssign: boolean;
      startSlaTimer: boolean;
      triageAlertMinutes: number | null;
      source: 'CONFIGURED' | 'DEFAULT';
    }>;
  }> {
    const [allowedTransitions, actions] = await Promise.all([
      this.serviceOrdersService.getAllowedTransitions(status, serviceTypeId),
      this.serviceOrdersService.getWorkflowActions(status, serviceTypeId)
    ]);

    return {
      status,
      serviceTypeId,
      allowedTransitions,
      actions
    };
  }

  @Post('templates')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria template de OS para abertura rapida com dados pre-preenchidos' })
  async createTemplate(
    @Body() dto: CreateServiceOrderTemplateDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.createTemplate(dto, actor);
  }

  @Get('templates')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista templates de OS' })
  async listTemplates(@Query() query: ListServiceOrderTemplateQueryDto): Promise<unknown> {
    return this.serviceOrdersService.listTemplates(query);
  }

  @Post('classification-rules')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria regra de classificacao automatica de OS' })
  async createClassificationRule(
    @Body() dto: CreateServiceOrderClassificationRuleDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.createClassificationRule(dto, actor);
  }

  @Get('classification-rules')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista regras de classificacao automatica de OS' })
  async listClassificationRules(
    @Query() query: ListServiceOrderClassificationRuleQueryDto
  ): Promise<unknown> {
    return this.serviceOrdersService.listClassificationRules(query);
  }

  @Post('workflow-transitions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria transicao configuravel do workflow de OS' })
  async createWorkflowTransition(
    @Body() dto: CreateWorkflowTransitionDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.createWorkflowTransition(dto, actor);
  }

  @Get('workflow-transitions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista transicoes configuradas do workflow de OS' })
  async listWorkflowTransitions(@Query() query: ListWorkflowTransitionQueryDto): Promise<unknown> {
    return this.serviceOrdersService.listWorkflowTransitions(query);
  }

  @Post('dynamic-field-schemas')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria ou atualiza esquema de campo dinamico por tipo de servico' })
  async upsertDynamicFieldSchema(
    @Body() dto: UpsertDynamicFieldSchemaDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.upsertDynamicFieldSchema(dto, actor);
  }

  @Get('dynamic-field-schemas')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista esquemas de campos dinamicos por tipo de servico' })
  async listDynamicFieldSchemas(@Query() query: ListDynamicFieldSchemaQueryDto): Promise<unknown> {
    return this.serviceOrdersService.listDynamicFieldSchemas(query);
  }

  @Get(':id/context')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Contexto operacional da OS (hierarquia, ativos e campos dinamicos)' })
  async findContext(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.serviceOrdersService.findContextById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualiza dados operacionais da OS' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.update(id, dto, actor);
  }

  @Post(':id/transition-status')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Executa transicao de status com historico imutavel' })
  async transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionServiceOrderStatusDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.transitionStatus(id, dto, actor);
  }

  @Post(':id/schedule')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Agenda ou reagenda atendimento de campo' })
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleServiceOrderDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.schedule(id, dto, actor);
  }

  @Post(':id/check-in')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Registra check-in do tecnico' })
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FieldCheckDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.registerCheckIn(id, dto, actor);
  }

  @Post(':id/check-out')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Registra check-out do tecnico' })
  async checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FieldCheckDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.serviceOrdersService.registerCheckOut(id, dto, actor);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT', 'CLIENT')
  @ApiOperation({ summary: 'Detalhe de uma ordem de servico' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.serviceOrdersService.findById(id);
  }
}
