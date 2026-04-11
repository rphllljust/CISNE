import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import { ListLoginHistoryQueryDto } from '../dto/list-login-history-query.dto';

import type { CreateAuditLogInput } from './create-audit-log.input';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: CreateAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        before: input.before as Prisma.InputJsonValue | undefined,
        after: input.after as Prisma.InputJsonValue | undefined,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        ip: input.ip,
        userAgent: input.userAgent,
        severity: input.severity ?? 'INFO'
      }
    });
  }

  async findAuditLogs(query: ListAuditLogsQueryDto): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where = {
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.action ? { action: query.action } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.auditLog.count({ where })
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

  async findLoginHistory(query: ListLoginHistoryQueryDto): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where = {
      ...(query.email ? { email: { contains: query.email, mode: 'insensitive' as const } } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.loginHistory.count({ where })
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
}
