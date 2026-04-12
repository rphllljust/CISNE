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
  CreateSupplierContractDto,
  CreateSupplierDto,
  ListExpiringSupplierContractsQueryDto,
  ListSuppliersQueryDto,
  UpdateSupplierDto
} from '../../application/dto/suppliers.dto';
import { SuppliersService } from '../../application/services/suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria fornecedor e dados cadastrais' })
  async create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.suppliersService.create(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista fornecedores com filtros' })
  async findAll(@Query() query: ListSuppliersQueryDto): Promise<unknown> {
    return this.suppliersService.findAll(query);
  }

  @Get('contracts/expiring')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista contratos de fornecedores proximos do vencimento' })
  async listExpiringContracts(
    @Query() query: ListExpiringSupplierContractsQueryDto
  ): Promise<unknown> {
    return this.suppliersService.listExpiringContracts(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Detalha fornecedor com contratos e ativos vinculados' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Atualiza fornecedor' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.suppliersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Exclusao logica de fornecedor' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.suppliersService.remove(id, actor);
    return { message: 'Fornecedor removido com sucesso' };
  }

  @Post(':id/contracts')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Adiciona contrato ao fornecedor' })
  async addContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplierContractDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.suppliersService.addContract(id, dto, actor);
  }
}
