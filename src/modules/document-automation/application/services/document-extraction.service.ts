/**
 * MÓDULO 1 + 2: Captura, Extração, Validação e Mapeamento de Documentos
 *
 * Implementa:
 * - Extração de campos-chave de PDF/imagem/e-mail/formulário
 * - Validação inteligente (campos obrigatórios, formatos, completude)
 * - Mapeamento para campos do sistema de OS
 * - Regras de negócio (prioridade por prazo, roteamento por especialidade)
 * - Histórico: reutiliza dados de cliente/equipamento existentes
 * - Auditoria de cada extração com timestamp e confiança
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Priority } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CorrectExtractionDto,
  DocumentSourceType,
  ExtractDocumentDto,
  ExtractionFieldStatus,
  ListExtractionsQueryDto,
  ProcessDocumentAndCreateOsDto
} from '../dto/document-automation.dto';

interface ExtractedFields {
  // Cliente
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientCep?: string;
  // Serviço
  serviceDescription?: string;
  serviceCategory?: string;
  servicePriority?: string;
  clientType?: string;
  // Equipamento
  equipmentBrand?: string;
  equipmentModel?: string;
  equipmentSerial?: string;
  equipmentLocation?: string;
  // Datas
  openDate?: string;
  desiredCompletionDate?: string;
  // Financeiro
  estimatedValue?: number;
  paymentMethod?: string;
}

interface FieldValidation {
  field: string;
  status: ExtractionFieldStatus;
  value: string | number | null;
  confidence: number;
  issue?: string;
}

interface ExtractionResult {
  extractedFields: ExtractedFields;
  fieldValidations: FieldValidation[];
  overallConfidence: number;
  isComplete: boolean;
  missingRequiredFields: string[];
  warnings: string[];
  mappedServiceOrderData: Record<string, unknown>;
}

@Injectable()
export class DocumentExtractionService {
  // Palavras-chave para categorias de serviço (configurável via painel)
  private readonly categoryKeywords: Record<string, string[]> = {
    MANUTENCAO: ['manutenção', 'manutencao', 'reparo', 'conserto', 'defeito', 'falha', 'quebrado'],
    INSTALACAO: ['instalação', 'instalacao', 'instalar', 'configurar', 'montar', 'setup'],
    SUPORTE: ['suporte', 'ajuda', 'problema', 'erro', 'não funciona', 'nao funciona', 'travado'],
    INSPECAO: ['inspeção', 'inspecao', 'vistoria', 'laudo', 'avaliação', 'verificação'],
    LIMPEZA: ['limpeza', 'higienização', 'higienizacao', 'limpar'],
    GARANTIA: ['garantia', 'recall', 'defeito de fábrica']
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Extrai campos de um documento recebido (MÓDULO 1.1)
   * Retorna JSON estruturado com dados extraídos e grau de confiança
   */
  async extractDocument(dto: ExtractDocumentDto, actor: JwtUserPayload): Promise<{
    extractionId: string;
    sourceType: string;
    result: ExtractionResult;
    createdAt: string;
  }> {
    const raw = this.decodeContent(dto.sourceType, dto.content);
    const extracted = this.parseFields(raw, dto.sourceType);
    const validations = this.validateFields(extracted);
    const overallConfidence = this.computeConfidence(validations);
    const missing = validations
      .filter((v) => v.status === ExtractionFieldStatus.MISSING && this.isRequired(v.field))
      .map((v) => v.field);
    const warnings = this.buildWarnings(validations);

    // Histórico: buscar cliente/equipamento existente
    let resolvedClientId: string | undefined;
    if (dto.clientId) {
      resolvedClientId = dto.clientId;
    } else if (extracted.clientEmail || extracted.clientPhone) {
      const existing = await this.prisma.client.findFirst({
        where: {
          deletedAt: null,
          OR: [
            extracted.clientEmail ? { email: extracted.clientEmail } : {},
            extracted.clientPhone ? { phone: extracted.clientPhone } : {}
          ].filter((c) => Object.keys(c).length > 0)
        },
        select: { id: true }
      });
      resolvedClientId = existing?.id;
    }

    const mapped = this.mapToServiceOrderData(extracted, resolvedClientId);

    // Persistir extração para auditoria (7.2 Logs e Auditoria)
    const record = await this.prisma.documentExtraction.create({
      data: {
        sourceType: dto.sourceType,
        rawContent: raw.slice(0, 5000),
        extractedData: this.toInputJson(extracted),
        fieldValidations: this.toInputJson(validations),
        overallConfidence,
        isComplete: missing.length === 0,
        missingFields: missing,
        warnings,
        mappedData: this.toInputJson(mapped),
        resolvedClientId,
        serviceOrderId: dto.serviceOrderId,
        createdById: actor.sub
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'DOCUMENT_EXTRACTED',
      resource: 'document_extraction',
      resourceId: record.id,
      metadata: { sourceType: dto.sourceType, overallConfidence, isComplete: missing.length === 0 }
    });

    return {
      extractionId: record.id,
      sourceType: dto.sourceType,
      result: {
        extractedFields: extracted,
        fieldValidations: validations,
        overallConfidence,
        isComplete: missing.length === 0,
        missingRequiredFields: missing,
        warnings,
        mappedServiceOrderData: mapped
      },
      createdAt: record.createdAt.toISOString()
    };
  }

  /**
   * Corrigir manualmente dados ambíguos (MÓDULO 1.1 - Permitir correção manual)
   */
  async correctExtraction(dto: CorrectExtractionDto, actor: JwtUserPayload): Promise<{
    extractionId: string;
    corrected: boolean;
  }> {
    const record = await this.prisma.documentExtraction.findUnique({
      where: { id: dto.extractionId }
    });
    if (!record) {
      throw new NotFoundException('Extração não encontrada');
    }

    const merged = {
      ...this.asRecord(record.extractedData),
      ...dto.corrections
    };
    const validations = this.validateFields(merged as ExtractedFields);
    const overallConfidence = this.computeConfidence(validations);
    const missing = validations
      .filter((v) => v.status === ExtractionFieldStatus.MISSING && this.isRequired(v.field))
      .map((v) => v.field);
    const mapped = this.mapToServiceOrderData(merged as ExtractedFields, record.resolvedClientId ?? undefined);

    await this.prisma.documentExtraction.update({
      where: { id: dto.extractionId },
      data: {
        extractedData: this.toInputJson(merged),
        fieldValidations: this.toInputJson(validations),
        overallConfidence,
        isComplete: missing.length === 0,
        missingFields: missing,
        mappedData: this.toInputJson(mapped),
        manuallyCorrectd: true,
        correctedById: actor.sub,
        correctedAt: new Date()
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'DOCUMENT_EXTRACTION_CORRECTED',
      resource: 'document_extraction',
      resourceId: dto.extractionId,
      metadata: { correctionFields: Object.keys(dto.corrections) }
    });

    return { extractionId: dto.extractionId, corrected: true };
  }

  /**
   * Extrai documento e cria OS automaticamente (MÓDULO 2 completo)
   * Inclui: mapeamento, regras de negócio, roteamento automático
   */
  async processAndCreateServiceOrder(
    dto: ProcessDocumentAndCreateOsDto,
    actor: JwtUserPayload
  ): Promise<{
    extractionId: string;
    serviceOrderId: string;
    orderNumber: number;
    autoClassified: boolean;
    assignedTechnicianId: string | null;
    budgetRequiresApproval: boolean;
  }> {
    const raw = this.decodeContent(dto.sourceType, dto.content);
    const extracted = { ...this.parseFields(raw, dto.sourceType), ...(dto.overrides ?? {}) } as ExtractedFields;
    const validations = this.validateFields(extracted);
    const missing = validations
      .filter((v) => v.status === ExtractionFieldStatus.MISSING && this.isRequired(v.field))
      .map((v) => v.field);

    // Bloquear se dados críticos faltarem (MÓDULO 2.2)
    const criticalMissing = missing.filter((f) => ['clientName', 'serviceDescription'].includes(f));
    if (criticalMissing.length > 0) {
      throw new Error(`Dados críticos ausentes: ${criticalMissing.join(', ')}. Corrija antes de criar a OS.`);
    }

    // Resolver cliente existente
    let clientId = extracted.clientEmail || extracted.clientPhone
      ? (await this.prisma.client.findFirst({
          where: {
            deletedAt: null,
            OR: [
              extracted.clientEmail ? { email: extracted.clientEmail } : {},
              extracted.clientPhone ? { phone: extracted.clientPhone } : {}
            ].filter((c) => Object.keys(c).length > 0)
          },
          select: { id: true }
        }))?.id
      : undefined;

    // Resolver tipo de serviço
    const category = extracted.serviceCategory ?? this.classifyCategory(extracted.serviceDescription ?? '');
    const serviceType = dto.serviceTypeId
      ? await this.prisma.serviceType.findFirst({ where: { id: dto.serviceTypeId, active: true } })
      : await this.prisma.serviceType.findFirst({
          where: {
            active: true,
            OR: [
              { subcategory: { contains: category, mode: 'insensitive' } },
              { name: { contains: category, mode: 'insensitive' } }
            ]
          }
        });

    if (!serviceType) {
      throw new NotFoundException('Tipo de serviço não encontrado para a categoria extraída');
    }

    // Calcular prioridade por prazo (MÓDULO 2.2 Regras de Negócio)
    const priority = this.calculatePriority(extracted.desiredCompletionDate);

    // Roteamento automático: técnico por especialidade + disponibilidade + carga (MÓDULO 2.2)
    const assignedTechnicianId = await this.routeTechnician(serviceType.subcategory ?? serviceType.name);

    // Verificar se orçamento requer aprovação (> R$5.000)
    const BUDGET_APPROVAL_THRESHOLD = 5000;
    const budgetRequiresApproval =
      typeof extracted.estimatedValue === 'number' && extracted.estimatedValue > BUDGET_APPROVAL_THRESHOLD;

    // Montar dados da OS
    const overallConfidence = this.computeConfidence(validations);

    // Persistir extração
    const extractionRecord = await this.prisma.documentExtraction.create({
      data: {
        sourceType: dto.sourceType,
        rawContent: raw.slice(0, 5000),
        extractedData: this.toInputJson(extracted),
        fieldValidations: this.toInputJson(validations),
        overallConfidence,
        isComplete: missing.length === 0,
        missingFields: missing,
        warnings: this.buildWarnings(validations),
        mappedData: this.toInputJson(this.mapToServiceOrderData(extracted, clientId)),
        resolvedClientId: clientId,
        createdById: actor.sub,
        autoProcessed: true
      }
    });

    // Criar OS
    const orderNumber = await this.getNextOrderNumber();
    const slaDeadline = this.computeSlaDeadline(serviceType.defaultSlaId ? 48 : 72);

    const serviceOrder = await this.prisma.serviceOrder.create({
      data: {
        orderNumber,
        title: extracted.serviceDescription?.slice(0, 120) ?? `OS Automática #${orderNumber}`,
        description: extracted.serviceDescription ?? '',
        status: 'OPEN',
        priority,
        clientId: clientId!,
        serviceTypeId: serviceType.id,
        assignedTechnicianId: assignedTechnicianId ?? undefined,
        estimatedValue: extracted.estimatedValue ?? undefined,
        openedAt: new Date(),
        slaDeadline,
        autoCreated: true,
        sourceExtractionId: extractionRecord.id,
        budgetRequiresApproval,
        budgetApprovalStatus: budgetRequiresApproval ? 'PENDING' : null,
        createdById: actor.sub
      }
    });

    await this.prisma.documentExtraction.update({
      where: { id: extractionRecord.id },
      data: { serviceOrderId: serviceOrder.id }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'DOCUMENT_AUTO_OS_CREATED',
      resource: 'service_order',
      resourceId: serviceOrder.id,
      metadata: { extractionId: extractionRecord.id, autoClassified: true, budgetRequiresApproval }
    });

    return {
      extractionId: extractionRecord.id,
      serviceOrderId: serviceOrder.id,
      orderNumber,
      autoClassified: true,
      assignedTechnicianId,
      budgetRequiresApproval
    };
  }

  /**
   * Listar extrações com filtros (para supervisor revisar baixa confiança - MÓDULO 6)
   */
  async listExtractions(query: ListExtractionsQueryDto): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: import('@prisma/client').Prisma.DocumentExtractionWhereInput = {
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.serviceOrderId ? { serviceOrderId: query.serviceOrderId } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentExtraction.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sourceType: true,
          overallConfidence: true,
          isComplete: true,
          missingFields: true,
          warnings: true,
          autoProcessed: true,
          manuallyCorrectd: true,
          serviceOrderId: true,
          resolvedClientId: true,
          createdAt: true
        }
      }),
      this.prisma.documentExtraction.count({ where })
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  // ─── Parsing interno (simula Parseur) ─────────────────────────────────────

  private decodeContent(sourceType: DocumentSourceType, content: string): string {
    // Para PDF/imagem em base64, extraímos como texto (em produção usar OCR/LLM)
    if (sourceType === DocumentSourceType.PDF || sourceType === DocumentSourceType.IMAGE) {
      try {
        return Buffer.from(content, 'base64').toString('utf-8');
      } catch {
        return content;
      }
    }
    return content;
  }

  private parseFields(text: string, sourceType: DocumentSourceType): ExtractedFields {
    const fields: ExtractedFields = {};

    // E-mail / cliente
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i);
    if (emailMatch) fields.clientEmail = emailMatch[0];

    // Telefone com DDD
    const phoneMatch = text.match(/\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/);
    if (phoneMatch) fields.clientPhone = phoneMatch[0].replace(/\s/g, '');

    // CEP
    const cepMatch = text.match(/\d{5}-?\d{3}/);
    if (cepMatch) fields.clientCep = cepMatch[0].replace('-', '');

    // Nome do cliente (heurística: linha com "Cliente:", "Nome:", "Solicitante:")
    const nameMatch = text.match(/(?:cliente|nome|solicitante)\s*[:\-]\s*([^\n\r,;]+)/i);
    if (nameMatch) fields.clientName = nameMatch[1].trim();

    // Descrição do serviço
    const descMatch = text.match(/(?:descrição|descricao|problema|serviço|solicitação)\s*[:\-]\s*([^\n\r]{10,})/i);
    if (descMatch) fields.serviceDescription = descMatch[1].trim();

    // Prazo / data desejada
    const dateMatch = text.match(/(?:prazo|data\s+desejada|previsão|concluir\s+até)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) fields.desiredCompletionDate = dateMatch[1];

    // Valor estimado
    const valueMatch = text.match(/(?:valor|orçamento|estimado)\s*[:\-]?\s*R?\$?\s*([\d.,]+)/i);
    if (valueMatch) {
      fields.estimatedValue = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Modelo / equipamento
    const modelMatch = text.match(/(?:modelo|equipamento|dispositivo)\s*[:\-]\s*([^\n\r,;]+)/i);
    if (modelMatch) fields.equipmentModel = modelMatch[1].trim();

    // Número de série
    const serialMatch = text.match(/(?:série|serial|s\/n)\s*[:\-]\s*([A-Z0-9\-]+)/i);
    if (serialMatch) fields.equipmentSerial = serialMatch[1].trim();

    // Categoria via palavras-chave
    if (fields.serviceDescription) {
      fields.serviceCategory = this.classifyCategory(fields.serviceDescription);
    }

    return fields;
  }

  private classifyCategory(text: string): string {
    const lower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return category;
      }
    }
    return 'SUPORTE';
  }

  // ─── Validação inteligente (MÓDULO 1.1) ───────────────────────────────────

  private validateFields(fields: ExtractedFields): FieldValidation[] {
    const validations: FieldValidation[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\(?\d{2}\)?\d{4,5}\d{4}$/;
    const cepRegex = /^\d{8}$/;

    const checks: Array<{
      field: keyof ExtractedFields;
      value: string | number | null | undefined;
      validator?: (v: string | number) => boolean;
      errorMsg?: string;
      requiredConfidence: number;
    }> = [
      { field: 'clientName', value: fields.clientName ?? null, requiredConfidence: 0.9 },
      {
        field: 'clientEmail',
        value: fields.clientEmail ?? null,
        validator: (v) => emailRegex.test(String(v)),
        errorMsg: 'E-mail inválido',
        requiredConfidence: 0.95
      },
      {
        field: 'clientPhone',
        value: fields.clientPhone ?? null,
        validator: (v) => phoneRegex.test(String(v).replace(/\D/g, '')),
        errorMsg: 'Telefone sem DDD válido',
        requiredConfidence: 0.85
      },
      {
        field: 'clientCep',
        value: fields.clientCep ?? null,
        validator: (v) => cepRegex.test(String(v).replace(/\D/g, '')),
        errorMsg: 'CEP inválido',
        requiredConfidence: 0.9
      },
      { field: 'serviceDescription', value: fields.serviceDescription ?? null, requiredConfidence: 0.9 },
      { field: 'serviceCategory', value: fields.serviceCategory ?? null, requiredConfidence: 0.7 },
      { field: 'equipmentModel', value: fields.equipmentModel ?? null, requiredConfidence: 0.6 },
      { field: 'desiredCompletionDate', value: fields.desiredCompletionDate ?? null, requiredConfidence: 0.8 },
      { field: 'estimatedValue', value: fields.estimatedValue ?? null, requiredConfidence: 0.75 }
    ];

    for (const check of checks) {
      if (check.value === null || check.value === undefined || check.value === '') {
        validations.push({
          field: check.field,
          status: ExtractionFieldStatus.MISSING,
          value: null,
          confidence: 0
        });
        continue;
      }

      if (check.validator && !check.validator(check.value)) {
        validations.push({
          field: check.field,
          status: ExtractionFieldStatus.INVALID,
          value: check.value,
          confidence: 0.3,
          issue: check.errorMsg
        });
        continue;
      }

      validations.push({
        field: check.field,
        status: ExtractionFieldStatus.OK,
        value: check.value,
        confidence: check.requiredConfidence
      });
    }

    return validations;
  }

  private isRequired(field: string): boolean {
    return ['clientName', 'serviceDescription'].includes(field);
  }

  private computeConfidence(validations: FieldValidation[]): number {
    if (!validations.length) return 0;
    const avg = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length;
    return Math.round(avg * 100) / 100;
  }

  private buildWarnings(validations: FieldValidation[]): string[] {
    return validations
      .filter((v) => v.status !== ExtractionFieldStatus.OK)
      .map((v) => {
        if (v.status === ExtractionFieldStatus.MISSING) return `Campo obrigatório ausente: ${v.field}`;
        if (v.status === ExtractionFieldStatus.INVALID) return `${v.field}: ${v.issue}`;
        return `${v.field}: ambíguo`;
      });
  }

  // ─── Mapeamento para OS (MÓDULO 2.1) ──────────────────────────────────────

  private mapToServiceOrderData(fields: ExtractedFields, clientId?: string): Record<string, unknown> {
    return {
      numero_os: 'AUTO_GERADO',
      cliente: {
        id: clientId ?? null,
        nome: fields.clientName ?? null,
        telefone: fields.clientPhone ?? null,
        email: fields.clientEmail ?? null,
        cep: fields.clientCep ?? null
      },
      servico: {
        categoria: fields.serviceCategory ?? null,
        descricao: fields.serviceDescription ?? null,
        prioridade: this.calculatePriority(fields.desiredCompletionDate),
        tipo_cliente: fields.clientType ?? null
      },
      equipamento: {
        modelo: fields.equipmentModel ?? null,
        numero_serie: fields.equipmentSerial ?? null,
        localizacao: fields.equipmentLocation ?? null
      },
      prazos: {
        data_abertura: new Date().toISOString(),
        data_prometida: fields.desiredCompletionDate ?? null,
        sla: 'BASEADO_EM_CATEGORIA'
      },
      financeiro: {
        valor_estimado: fields.estimatedValue ?? null,
        forma_pagamento: fields.paymentMethod ?? null
      }
    };
  }

  // ─── Regras de negócio (MÓDULO 2.2) ───────────────────────────────────────

  /** Prioridade: Alta ≤ 24h; Média ≤ 3 dias; Normal > 3 dias */
  private calculatePriority(desiredDate?: string): Priority {
    if (!desiredDate) return Priority.MEDIUM;
    const target = new Date(desiredDate.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    if (isNaN(target.getTime())) return Priority.MEDIUM;
    const hoursUntil = (target.getTime() - Date.now()) / 3600000;
    if (hoursUntil <= 24) return Priority.HIGH;
    if (hoursUntil <= 72) return Priority.MEDIUM;
    return Priority.LOW;
  }

  /** Roteamento automático: especialidade + carga atual (MÓDULO 2.2) */
  private async routeTechnician(skill: string): Promise<string | null> {
    const members = await this.prisma.teamMember.findMany({
      where: {
        active: true,
        specialty: { contains: skill, mode: 'insensitive' },
        user: { deletedAt: null, status: 'ACTIVE' }
      },
      select: { userId: true }
    });

    if (!members.length) return null;

    const technicianIds = members.map((m) => m.userId);
    const workload = await this.prisma.serviceOrder.groupBy({
      by: ['assignedTechnicianId'],
      where: {
        deletedAt: null,
        assignedTechnicianId: { in: technicianIds },
        status: { notIn: ['COMPLETED', 'CANCELED'] }
      },
      _count: { _all: true }
    });

    const workloadMap = new Map(
      workload
        .filter((r): r is typeof r & { assignedTechnicianId: string } => Boolean(r.assignedTechnicianId))
        .map((r) => [r.assignedTechnicianId, r._count._all])
    );

    const sorted = technicianIds.sort((a, b) => (workloadMap.get(a) ?? 0) - (workloadMap.get(b) ?? 0));
    return sorted[0] ?? null;
  }

  private async getNextOrderNumber(): Promise<number> {
    const last = await this.prisma.serviceOrder.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });
    return (last?.orderNumber ?? 0) + 1;
  }

  private computeSlaDeadline(hours: number): Date {
    return new Date(Date.now() + hours * 3600000);
  }

  private toInputJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
