import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';

import { DashboardFilterDto } from './dashboard-filter.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(filter: DashboardFilterDto): Promise<Record<string, unknown>> {
    const where: Prisma.ServiceOrderWhereInput = {
      deletedAt: null,
      ...(filter.startDate || filter.endDate
        ? {
            openedAt: {
              ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
              ...(filter.endDate ? { lte: new Date(filter.endDate) } : {})
            }
          }
        : {})
    };

    const now = new Date();

    const [
      totalOpen,
      totalInProgress,
      totalCompleted,
      totalCanceled,
      totalOverdue,
      totals,
      completedOrders,
      timelineByStatus,
      groupedByTechnician,
      groupedByClient
    ] = await Promise.all([
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: 'OPEN'
        }
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: {
            in: ['IN_PROGRESS', 'IN_TRANSIT', 'PAUSED', 'WAITING_CUSTOMER', 'WAITING_PARTS']
          }
        }
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: 'COMPLETED'
        }
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: 'CANCELED'
        }
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: {
            notIn: ['COMPLETED', 'CANCELED']
          },
          slaDueAt: {
            lt: now
          }
        }
      }),
      this.prisma.serviceOrder.findMany({
        where,
        select: {
          id: true,
          openedAt: true,
          startedAt: true,
          completedAt: true,
          slaBreached: true,
          status: true
        }
      }),
      this.prisma.serviceOrder.count({
        where: {
          ...where,
          status: 'COMPLETED',
          slaBreached: false
        }
      }),
      this.prisma.serviceOrder.groupBy({
        by: ['status'],
        where,
        _count: {
          _all: true
        }
      }),
      this.prisma.serviceOrder.groupBy({
        by: ['assignedTechnicianId'],
        where: {
          ...where,
          assignedTechnicianId: {
            not: null
          }
        },
        _count: {
          _all: true
        }
      }),
      this.prisma.serviceOrder.groupBy({
        by: ['clientId'],
        where,
        _count: {
          _all: true
        }
      })
    ]);

    const startDurations = totals
      .filter((item) => item.startedAt)
      .map((item) => Number((item.startedAt!.getTime() - item.openedAt.getTime()) / 60000));

    const completionDurations = totals
      .filter((item) => item.completedAt)
      .map((item) => Number((item.completedAt!.getTime() - item.openedAt.getTime()) / 60000));

    const avgStartMinutes = startDurations.length
      ? Math.round(startDurations.reduce((a, b) => a + b, 0) / startDurations.length)
      : 0;

    const avgCompletionMinutes = completionDurations.length
      ? Math.round(completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length)
      : 0;

    const slaViolated = totals.filter((item) => item.status === 'COMPLETED' && item.slaBreached).length;

    const technicianIds = groupedByTechnician
      .map((item) => item.assignedTechnicianId)
      .filter((id): id is string => Boolean(id));
    const clientIds = groupedByClient.map((item) => item.clientId);

    const [technicians, clients] = await Promise.all([
      technicianIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: technicianIds } },
            select: { id: true, fullName: true }
          })
        : [],
      clientIds.length
        ? this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true }
          })
        : []
    ]);

    const technicianMap = new Map(technicians.map((tech) => [tech.id, tech.fullName]));
    const clientMap = new Map(clients.map((client) => [client.id, client.name]));

    return {
      cards: {
        totalOpen,
        totalInProgress,
        totalCompleted,
        totalCanceled,
        totalOverdue,
        avgStartMinutes,
        avgCompletionMinutes,
        slaComplied: completedOrders,
        slaViolated
      },
      charts: {
        byStatus: timelineByStatus.map((item) => ({
          status: item.status,
          total: item._count._all
        })),
        byTechnician: groupedByTechnician
          .map((item) => ({
            technicianId: item.assignedTechnicianId,
            technicianName: item.assignedTechnicianId
              ? technicianMap.get(item.assignedTechnicianId) ?? 'Sem nome'
              : 'Nao atribuido',
            total: item._count._all
          }))
          .sort((a, b) => b.total - a.total),
        byClient: groupedByClient
          .map((item) => ({
            clientId: item.clientId,
            clientName: clientMap.get(item.clientId) ?? 'Sem nome',
            total: item._count._all
          }))
          .sort((a, b) => b.total - a.total)
      }
    };
  }
}
