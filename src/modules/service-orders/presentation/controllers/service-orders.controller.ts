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

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT', 'CLIENT')
  @ApiOperation({ summary: 'Detalhe de uma ordem de servico' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.serviceOrdersService.findById(id);
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

  @Get('meta/allowed-transitions/:status')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Consulta transicoes permitidas para um status atual' })
  getAllowedTransitions(
    @Param('status', new ParseEnumPipe(ServiceOrderStatus)) status: ServiceOrderStatus
  ): { status: ServiceOrderStatus; allowedTransitions: ServiceOrderStatus[] } {
    return {
      status,
      allowedTransitions: this.serviceOrdersService.getAllowedTransitions(status)
    };
  }
}
