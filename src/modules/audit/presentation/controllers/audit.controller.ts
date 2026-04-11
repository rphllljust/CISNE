import {
  Controller,
  Get,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../../common/decorators/roles.decorator';
import { ListAuditLogsQueryDto } from '../../application/dto/list-audit-logs-query.dto';
import { ListLoginHistoryQueryDto } from '../../application/dto/list-login-history-query.dto';
import { AuditService } from '../../application/services/audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Lista logs de auditoria com paginação' })
  async findAuditLogs(@Query() query: ListAuditLogsQueryDto): Promise<unknown> {
    return this.auditService.findAuditLogs(query);
  }

  @Get('login-history')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Lista historico de login e atividades criticas de autenticacao' })
  async findLoginHistory(@Query() query: ListLoginHistoryQueryDto): Promise<unknown> {
    return this.auditService.findLoginHistory(query);
  }
}
