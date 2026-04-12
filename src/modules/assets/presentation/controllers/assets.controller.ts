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
import {
  CreateAssetDto,
  ListAssetsQueryDto,
  RegisterAssetMaintenanceDto,
  RegisterInventoryTransactionDto,
  UpdateAssetDto
} from '../../application/dto/assets.dto';
import { AssetsService } from '../../application/services/assets.service';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Cria ativo com controle de ciclo de vida' })
  async create(
    @Body() dto: CreateAssetDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.assetsService.create(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista ativos com filtros operacionais' })
  async findAll(@Query() query: ListAssetsQueryDto): Promise<unknown> {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Detalhe de ativo com manutencoes e movimentacoes' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.assetsService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Atualiza cadastro e estado de ativo' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.assetsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Exclusao logica de ativo' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.assetsService.remove(id, actor);
    return { message: 'Ativo removido com sucesso' };
  }

  @Post(':id/maintenances')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Registra manutencao preventiva/corretiva do ativo' })
  async registerMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterAssetMaintenanceDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.assetsService.registerMaintenance(id, dto, actor);
  }

  @Post(':id/inventory-transactions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Registra entrada/saida/transferencia de inventario do ativo' })
  async registerInventoryTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterInventoryTransactionDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.assetsService.registerInventoryTransaction(id, dto, actor);
  }
}
