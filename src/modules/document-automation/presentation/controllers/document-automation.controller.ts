import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../../modules/auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../../../modules/auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../../../modules/auth/presentation/guards/roles.guard';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  BudgetApprovalDto,
  CorrectExtractionDto,
  ExtractDocumentDto,
  ListExtractionsQueryDto,
  ProcessDocumentAndCreateOsDto
} from '../../application/dto/document-automation.dto';
import { AutomationMetricsService } from '../../application/services/automation-metrics.service';
import { BudgetApprovalService } from '../../application/services/budget-approval.service';
import { DocumentExtractionService } from '../../application/services/document-extraction.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentAutomationController {
  constructor(
    private readonly extractionService: DocumentExtractionService,
    private readonly budgetApprovalService: BudgetApprovalService,
    private readonly metricsService: AutomationMetricsService
  ) {}

  // ─── MÓDULO 1: Extração de Documentos ─────────────────────────────────────

  /** Extrair dados de um documento (PDF/imagem/e-mail/formulário) */
  @Post('document-automation/extract')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  extractDocument(@Body() dto: ExtractDocumentDto, @Request() req: { user: JwtUserPayload }) {
    return this.extractionService.extractDocument(dto, req.user);
  }

  /** Corrigir manualmente dados ambíguos de uma extração */
  @Patch('document-automation/extractions/:id/correct')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  correctExtraction(
    @Param('id') id: string,
    @Body() dto: CorrectExtractionDto,
    @Request() req: { user: JwtUserPayload }
  ) {
    dto.extractionId = id;
    return this.extractionService.correctExtraction(dto, req.user);
  }

  /** Listar extrações (supervisor revisa baixa confiança - MÓDULO 6) */
  @Get('document-automation/extractions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  listExtractions(@Query() query: ListExtractionsQueryDto) {
    return this.extractionService.listExtractions(query);
  }

  // ─── MÓDULO 2: Extração + Criação Automática de OS ─────────────────────────

  /** Processar documento e criar OS automaticamente (pipeline completo) */
  @Post('document-automation/process-and-create')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'ATTENDANT')
  processAndCreate(
    @Body() dto: ProcessDocumentAndCreateOsDto,
    @Request() req: { user: JwtUserPayload }
  ) {
    return this.extractionService.processAndCreateServiceOrder(dto, req.user);
  }

  // ─── MÓDULO 3: Aprovação de Orçamento ──────────────────────────────────────

  /** Listar OSs com orçamento pendente de aprovação */
  @Get('document-automation/budget-approvals/pending')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  listPendingApprovals(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.budgetApprovalService.listPendingApprovals(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  /** Aprovar ou rejeitar orçamento (gerente) */
  @Post('document-automation/budget-approvals')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  processBudgetApproval(@Body() dto: BudgetApprovalDto, @Request() req: { user: JwtUserPayload }) {
    return this.budgetApprovalService.processApproval(dto, req.user);
  }

  // ─── MÓDULO 7: Métricas de Automação ──────────────────────────────────────

  /** Dashboard de métricas (taxa automação, erro extração, confirmação cliente) */
  @Get('document-automation/metrics/dashboard')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  getMetricsDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.metricsService.getAutomationDashboard({ startDate, endDate });
  }

  /** Série temporal de taxa de automação */
  @Get('document-automation/metrics/time-series')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  getTimeSeries(@Query('days') days?: string) {
    return this.metricsService.getAutomationRateTimeSeries(days ? parseInt(days, 10) : 30);
  }

  /** Log de auditoria de extrações (MÓDULO 7.2) */
  @Get('document-automation/metrics/audit-log')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  getAuditLog(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.metricsService.getExtractionAuditLog(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
  }
}
