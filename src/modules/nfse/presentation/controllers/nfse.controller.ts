import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtUserPayload } from '@/modules/auth/domain/interfaces/jwt-user-payload.interface';
import { NfseService } from '../../application/services/nfse.service';

@ApiTags('NFS-e (Nota Fiscal de Serviço Eletrônica)')
@ApiBearerAuth()
@Controller('nfse')
export class NfseController {
  constructor(private readonly nfseService: NfseService) {}

  @Post('emitir')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'FINANCIAL_MANAGER')
  @ApiOperation({
    summary: 'Emitir NFS-e automaticamente',
    description: 'Cria e emite NFS-e quando SO é finalizada. Integra com SEFAZ, valida com certificado A1.'
  })
  async emitirNfse(
    @Body() body: { serviceOrderId: string; invoiceId: string },
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.nfseService.emitirNfseComSo(
      body.serviceOrderId,
      body.invoiceId,
      actor
    );
  }

  @Get('consultar/:nfseId')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'FINANCIAL_MANAGER', 'ATTENDANT')
  @ApiOperation({
    summary: 'Consultar status na SEFAZ',
    description: 'Verifica status atual da NFS-e no webservice da SEFAZ'
  })
  async consultarStatus(
    @Param('nfseId', ParseUUIDPipe) nfseId: string
  ): Promise<unknown> {
    return this.nfseService.consultarStatusNfse(nfseId);
  }

  @Delete(':nfseId')
  @Roles('SUPER_ADMIN', 'FINANCIAL_MANAGER')
  @ApiOperation({
    summary: 'Cancelar NFS-e',
    description: 'Cancela NFS-e na SEFAZ. Operação irreversível.'
  })
  async cancelarNfse(
    @Param('nfseId', ParseUUIDPipe) nfseId: string,
    @Query('motivo') motivo: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.nfseService.cancelarNfse(nfseId, motivo, actor);
  }
}
