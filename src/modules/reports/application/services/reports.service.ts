import { Injectable } from '@nestjs/common';
import { Prisma, ServiceOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ReportsFilterDto } from '../dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(filter: ReportsFilterDto): Promise<Record<string, unknown>> {
    const where = this.buildServiceOrdersWhere(filter);

    const [total, completed, canceled, inProgress, breached, reopened, totalsForDurations] =
      await Promise.all([
        this.prisma.serviceOrder.count({ where }),
        this.prisma.serviceOrder.count({
          where: { ...where, status: ServiceOrderStatus.COMPLETED }
        }),
        this.prisma.serviceOrder.count({
          where: { ...where, status: ServiceOrderStatus.CANCELED }
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
            slaBreached: true
          }
        }),
        this.prisma.serviceOrder.count({
          where: {
            ...where,
            reopenedCount: { gt: 0 }
          }
        }),
        this.prisma.serviceOrder.findMany({
          where: {
            ...where,
            status: ServiceOrderStatus.COMPLETED,
            completedAt: { not: null }
          },
          select: {
            openedAt: true,
            startedAt: true,
            completedAt: true,
            serviceType: {
              select: {
                estimatedDurationMinutes: true
              }
            }
          }
        })
      ]);

    const slaComplianceRate = completed > 0 ? ((completed - breached) / completed) * 100 : 0;
    const reworkRate = completed > 0 ? (reopened / completed) * 100 : 0;

    const averageResponseMinutes = totalsForDurations.length
      ? totalsForDurations.reduce((sum, item) => {
          const responseAt = item.startedAt ?? item.completedAt ?? item.openedAt;
          return sum + (responseAt.getTime() - item.openedAt.getTime()) / 60000;
        }, 0) / totalsForDurations.length
      : 0;

    const durationAccuracyPercent = totalsForDurations.length
      ? totalsForDurations.reduce((sum, item) => {
          const completedAt = item.completedAt ?? item.openedAt;
          const realDuration = (completedAt.getTime() - item.openedAt.getTime()) / 60000;
          const estimated = item.serviceType.estimatedDurationMinutes || 1;
          const delta = Math.abs(realDuration - estimated);
          const accuracy = Math.max(0, 100 - (delta / estimated) * 100);
          return sum + accuracy;
        }, 0) / totalsForDurations.length
      : 0;

    const byStatus = await this.prisma.serviceOrder.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });

    return {
      totals: {
        total,
        completed,
        canceled,
        inProgress
      },
      kpis: {
        slaComplianceRate: Number(slaComplianceRate.toFixed(2)),
        reworkRate: Number(reworkRate.toFixed(2)),
        averageResponseMinutes: Number(averageResponseMinutes.toFixed(2)),
        durationAccuracyPercent: Number(durationAccuracyPercent.toFixed(2))
      },
      byStatus: byStatus.map((row) => ({
        status: row.status,
        total: row._count._all
      }))
    };
  }

  async technicianEfficiency(
    technicianId: string,
    filter: ReportsFilterDto
  ): Promise<Record<string, unknown>> {
    const where = this.buildServiceOrdersWhere({
      ...filter,
      technicianId
    });

    const [technician, orders, completedOrders, breachedOrders] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: technicianId },
        select: { id: true, fullName: true, email: true }
      }),
      this.prisma.serviceOrder.findMany({
        where,
        select: {
          id: true,
          status: true,
          openedAt: true,
          completedAt: true,
          reopenedCount: true,
          slaBreached: true
        }
      }),
      this.prisma.serviceOrder.count({
        where: { ...where, status: ServiceOrderStatus.COMPLETED }
      }),
      this.prisma.serviceOrder.count({
        where: { ...where, status: ServiceOrderStatus.COMPLETED, slaBreached: true }
      })
    ]);

    if (!technician) {
      return {
        technicianId,
        message: 'Tecnico nao encontrado'
      };
    }

    const closedDurations = orders
      .filter((order) => order.completedAt)
      .map((order) => ((order.completedAt as Date).getTime() - order.openedAt.getTime()) / 60000);
    const averageCompletionMinutes = closedDurations.length
      ? closedDurations.reduce((a, b) => a + b, 0) / closedDurations.length
      : 0;

    const reworkCount = orders.filter((order) => order.reopenedCount > 0).length;
    const slaCompliance = completedOrders > 0 ? ((completedOrders - breachedOrders) / completedOrders) * 100 : 0;

    return {
      technician,
      totals: {
        totalOrders: orders.length,
        completedOrders,
        reworkCount,
        breachedOrders
      },
      kpis: {
        averageCompletionMinutes: Number(averageCompletionMinutes.toFixed(2)),
        slaCompliancePercent: Number(slaCompliance.toFixed(2))
      }
    };
  }

  async exportServiceOrdersCsv(filter: ReportsFilterDto): Promise<string> {
    const where = this.buildServiceOrdersWhere(filter);

    const rows = await this.prisma.serviceOrder.findMany({
      where,
      include: {
        client: {
          select: {
            name: true,
            taxId: true
          }
        },
        serviceType: {
          select: {
            name: true
          }
        },
        assignedTechnician: {
          select: {
            fullName: true
          }
        },
        assignedTeam: {
          select: {
            name: true
          }
        }
      },
      orderBy: { openedAt: 'desc' }
    });

    const header = [
      'orderNumber',
      'status',
      'priority',
      'openedAt',
      'completedAt',
      'clientName',
      'clientTaxId',
      'serviceType',
      'team',
      'technician',
      'slaBreached',
      'reopenedCount',
      'title'
    ];

    const lines = rows.map((row) =>
      [
        row.orderNumber,
        row.status,
        row.priority,
        row.openedAt.toISOString(),
        row.completedAt ? row.completedAt.toISOString() : '',
        row.client.name,
        row.client.taxId,
        row.serviceType.name,
        row.assignedTeam?.name ?? '',
        row.assignedTechnician?.fullName ?? '',
        row.slaBreached ? 'true' : 'false',
        row.reopenedCount,
        row.title
      ]
        .map((cell) => this.csvEscape(String(cell)))
        .join(',')
    );

    return [header.join(','), ...lines].join('\n');
  }

  private buildServiceOrdersWhere(filter: ReportsFilterDto): Prisma.ServiceOrderWhereInput {
    return {
      deletedAt: null,
      ...(filter.startDate || filter.endDate
        ? {
            openedAt: {
              ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
              ...(filter.endDate ? { lte: new Date(filter.endDate) } : {})
            }
          }
        : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.teamId ? { assignedTeamId: filter.teamId } : {}),
      ...(filter.technicianId ? { assignedTechnicianId: filter.technicianId } : {}),
      ...(filter.clientId ? { clientId: filter.clientId } : {}),
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
              { client: { name: { contains: filter.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
  }

  private csvEscape(value: string): string {
    const normalized = value.replace(/"/g, '""');
    return `"${normalized}"`;
  }
}
