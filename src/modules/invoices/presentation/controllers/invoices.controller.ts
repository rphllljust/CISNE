import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { CancelInvoiceDto, EmitInvoiceDto, ListInvoicesQueryDto } from '../../application/dto/invoices.dto';
import { InvoicesService } from '../../application/services/invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('emit')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'ATTENDANT')
  @ApiOperation({ summary: 'Emite nota para OS concluida' })
  async emit(
    @Body() dto: EmitInvoiceDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.invoicesService.emit(dto, actor);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista notas com filtros e paginacao' })
  async findAll(@Query() query: ListInvoicesQueryDto): Promise<unknown> {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  @ApiOperation({ summary: 'Busca detalhe de nota por id' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.invoicesService.findById(id);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cancela nota emitida' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.invoicesService.cancel(id, dto, actor);
  }
}
