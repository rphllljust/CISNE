import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ChangeStatus, ProblemStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateChangeRequestDto,
  CreateProblemRecordDto,
  ItsmMetricsQueryDto,
  ListChangeRequestsQueryDto,
  ListProblemRecordsQueryDto,
  UpdateChangeRequestDto,
  UpdateProblemRecordDto
} from '../dto/itsm.dto';

@Injectable()
export class ItsmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createProblem(
    dto: CreateProblemRecordDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.problemRecord.findUnique({
      where: { code: dto.code },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Codigo de problema ja cadastrado');
    }

    const created = await this.prisma.problemRecord.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        impact: dto.impact,
        workaround: dto.workaround,
        ownerId: dto.ownerId,
        openedById: actor.sub,
        relatedServiceOrderId: dto.relatedServiceOrderId
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'PROBLEM_CREATED',
      resource: 'problem_record',
      resourceId: created.id
    });

    return created;
  }

  async listProblems(query: ListProblemRecordsQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.ProblemRecordWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.problemRecord.findMany({
        where,
        include: {
          changeRequests: {
            select: {
              id: true,
              code: true,
              status: true
            }
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildProblemsOrderBy(query.sort)
      }),
      this.prisma.problemRecord.count({ where })
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

  async findProblemById(id: string): Promise<Record<string, unknown>> {
    const problem = await this.prisma.problemRecord.findUnique({
      where: { id },
      include: {
        changeRequests: true
      }
    });
    if (!problem) {
      throw new NotFoundException('Problema nao encontrado');
    }
    return problem;
  }

  async updateProblem(
    id: string,
    dto: UpdateProblemRecordDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.problemRecord.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new NotFoundException('Problema nao encontrado');
    }

    const updated = await this.prisma.problemRecord.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        impact: dto.impact,
        rootCause: dto.rootCause,
        workaround: dto.workaround,
        ownerId: dto.ownerId,
        resolvedAt:
          dto.status === ProblemStatus.RESOLVED && !existing.resolvedAt ? new Date() : undefined,
        closedAt: dto.status === ProblemStatus.CLOSED ? new Date() : undefined
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'PROBLEM_UPDATED',
      resource: 'problem_record',
      resourceId: id
    });

    return updated;
  }

  async createChange(
    dto: CreateChangeRequestDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.changeRequest.findUnique({
      where: { code: dto.code },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Codigo de mudanca ja cadastrado');
    }

    if (dto.problemId) {
      const problem = await this.prisma.problemRecord.findUnique({
        where: { id: dto.problemId },
        select: { id: true }
      });
      if (!problem) {
        throw new NotFoundException('Problema relacionado nao encontrado');
      }
    }

    const created = await this.prisma.changeRequest.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        riskLevel: dto.riskLevel,
        impactAnalysis: dto.impactAnalysis,
        implementationPlan: dto.implementationPlan,
        rollbackPlan: dto.rollbackPlan,
        requestedById: actor.sub,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
        problemId: dto.problemId,
        relatedServiceOrderId: dto.relatedServiceOrderId
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'CHANGE_REQUEST_CREATED',
      resource: 'change_request',
      resourceId: created.id
    });

    return created;
  }

  async listChanges(query: ListChangeRequestsQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.ChangeRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.changeRequest.findMany({
        where,
        include: {
          problem: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true
            }
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildChangesOrderBy(query.sort)
      }),
      this.prisma.changeRequest.count({ where })
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

  async findChangeById(id: string): Promise<Record<string, unknown>> {
    const change = await this.prisma.changeRequest.findUnique({
      where: { id },
      include: {
        problem: true
      }
    });
    if (!change) {
      throw new NotFoundException('Mudanca nao encontrada');
    }
    return change;
  }

  async updateChange(
    id: string,
    dto: UpdateChangeRequestDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.changeRequest.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new NotFoundException('Mudanca nao encontrada');
    }

    if (dto.problemId) {
      const problem = await this.prisma.problemRecord.findUnique({
        where: { id: dto.problemId },
        select: { id: true }
      });
      if (!problem) {
        throw new NotFoundException('Problema relacionado nao encontrado');
      }
    }

    const approvedNow = dto.status === ChangeStatus.APPROVED && existing.status !== ChangeStatus.APPROVED;
    const completedNow = dto.status === ChangeStatus.COMPLETED && existing.status !== ChangeStatus.COMPLETED;

    const updated = await this.prisma.changeRequest.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        status: dto.status,
        riskLevel: dto.riskLevel,
        impactAnalysis: dto.impactAnalysis,
        implementationPlan: dto.implementationPlan,
        rollbackPlan: dto.rollbackPlan,
        problemId: dto.problemId,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
        scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
        approvedAt: approvedNow ? new Date() : undefined,
        approvedById: approvedNow ? actor.sub : undefined,
        implementedAt: completedNow ? new Date() : undefined
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'CHANGE_REQUEST_UPDATED',
      resource: 'change_request',
      resourceId: id
    });

    return updated;
  }

  async metrics(query: ItsmMetricsQueryDto): Promise<Record<string, unknown>> {
    const problemsWhere: Prisma.ProblemRecordWhereInput = query.onlyOpen
      ? { status: { in: [ProblemStatus.OPEN, ProblemStatus.UNDER_INVESTIGATION, ProblemStatus.KNOWN_ERROR] } }
      : {};
    const changesWhere: Prisma.ChangeRequestWhereInput = query.onlyOpen
      ? { status: { notIn: [ChangeStatus.COMPLETED, ChangeStatus.CANCELED] } }
      : {};

    const [totalProblems, totalChanges, linkedIncidents, resolvedProblems] = await Promise.all([
      this.prisma.problemRecord.count({ where: problemsWhere }),
      this.prisma.changeRequest.count({ where: changesWhere }),
      this.prisma.problemRecord.count({
        where: {
          ...problemsWhere,
          relatedServiceOrderId: {
            not: null
          }
        }
      }),
      this.prisma.problemRecord.findMany({
        where: {
          ...problemsWhere,
          resolvedAt: { not: null }
        },
        select: {
          openedAt: true,
          resolvedAt: true
        }
      })
    ]);

    const meanResolutionHours = resolvedProblems.length
      ? Number(
          (
            resolvedProblems.reduce((acc, problem) => {
              const resolvedAt = problem.resolvedAt ?? problem.openedAt;
              return acc + (resolvedAt.getTime() - problem.openedAt.getTime()) / 3600000;
            }, 0) / resolvedProblems.length
          ).toFixed(2)
        )
      : 0;

    return {
      totalProblems,
      totalChanges,
      linkedIncidents,
      meanResolutionHours
    };
  }

  private buildProblemsOrderBy(sort?: string): Prisma.ProblemRecordOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set(['createdAt', 'updatedAt', 'openedAt', 'priority', 'status', 'code']);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.ProblemRecordOrderByWithRelationInput;
  }

  private buildChangesOrderBy(sort?: string): Prisma.ChangeRequestOrderByWithRelationInput {
    if (!sort) {
      return { createdAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set([
      'createdAt',
      'updatedAt',
      'scheduledStartAt',
      'riskLevel',
      'status',
      'code'
    ]);
    const safeField = allowedFields.has(field) ? field : 'createdAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.ChangeRequestOrderByWithRelationInput;
  }
}
