import {
  Body,
  Controller,
  Delete,
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
import { CreateClientDto } from '../../application/dto/create-client.dto';
import { ListClientsQueryDto } from '../../application/dto/list-clients-query.dto';
import { UpdateClientDto } from '../../application/dto/update-client.dto';
import { ClientsService } from '../../application/services/clients.service';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'ATTENDANT')
  @ApiOperation({ summary: 'Cria cliente (PF/PJ) com endereco e contrato opcional' })
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.clientsService.create(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista clientes com filtros e paginacao' })
  async findAll(@Query() query: ListClientsQueryDto): Promise<unknown> {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Busca cliente por id' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.clientsService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'ATTENDANT')
  @ApiOperation({ summary: 'Atualiza dados de cliente' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.clientsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Exclusao logica de cliente' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.clientsService.remove(id, actor);
    return { message: 'Cliente removido com sucesso' };
  }
}
