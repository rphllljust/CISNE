import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { OptimizeRouteDto, UpdateTechnicianLocationDto } from '../dto/dispatch.dto';

type GeoPoint = { latitude: number; longitude: number };

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async updateTechnicianLocation(
    technicianId: string,
    dto: UpdateTechnicianLocationDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const technician = await this.prisma.user.findFirst({
      where: {
        id: technicianId,
        deletedAt: null
      },
      select: { id: true, fullName: true }
    });
    if (!technician) {
      throw new NotFoundException('Tecnico nao encontrado');
    }

    const ping = await this.prisma.technicianLocationPing.create({
      data: {
        userId: technicianId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyM: dto.accuracyM,
        source: dto.source
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'TECHNICIAN_LOCATION_UPDATED',
      resource: 'dispatch',
      resourceId: technicianId,
      metadata: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        source: dto.source
      }
    });

    return {
      technicianId,
      technicianName: technician.fullName,
      ping
    };
  }

  async recommendTechnicians(
    serviceOrderId: string,
    requiredSkill?: string
  ): Promise<{
    serviceOrderId: string;
    referencePoint: GeoPoint | null;
    recommendations: Array<{
      technicianId: string;
      technicianName: string;
      teamId: string;
      distanceKm: number | null;
      openOrders: number;
      skillMatch: boolean;
      score: number;
    }>;
  }> {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, deletedAt: null },
      include: { serviceType: true }
    });
    if (!serviceOrder) {
      throw new NotFoundException('Ordem de servico nao encontrada');
    }

    const referencePoint = await this.resolveServiceOrderPoint(serviceOrder.id, serviceOrder.locationAddressId);
    const skillNeed = (requiredSkill ?? serviceOrder.serviceType.subcategory ?? serviceOrder.serviceType.name)
      .trim()
      .toLowerCase();

    const members = await this.prisma.teamMember.findMany({
      where: {
        active: true,
        team: { active: true },
        user: { deletedAt: null, status: 'ACTIVE' }
      },
      include: {
        user: {
          select: { id: true, fullName: true }
        }
      }
    });

    const technicianIds = [...new Set(members.map((item) => item.userId))];
    const [locationPings, workload] = await Promise.all([
      technicianIds.length
        ? this.prisma.technicianLocationPing.findMany({
            where: { userId: { in: technicianIds } },
            orderBy: { createdAt: 'desc' }
          })
        : [],
      technicianIds.length
        ? this.prisma.serviceOrder.groupBy({
            by: ['assignedTechnicianId'],
            where: {
              deletedAt: null,
              assignedTechnicianId: { in: technicianIds },
              status: { notIn: ['COMPLETED', 'CANCELED'] }
            },
            _count: { _all: true }
          })
        : []
    ]);

    const latestPingByUser = new Map<string, { latitude: number; longitude: number }>();
    for (const ping of locationPings) {
      if (!latestPingByUser.has(ping.userId)) {
        latestPingByUser.set(ping.userId, {
          latitude: Number(ping.latitude),
          longitude: Number(ping.longitude)
        });
      }
    }

    const workloadByUser = new Map(
      workload
        .filter((row): row is typeof row & { assignedTechnicianId: string } => Boolean(row.assignedTechnicianId))
        .map((row) => [row.assignedTechnicianId, row._count._all])
    );

    const recommendations = members
      .map((member) => {
        const specialty = (member.specialty ?? '').toLowerCase();
        const skillMatch = skillNeed.length > 0 ? specialty.includes(skillNeed) : false;
        const openOrders = workloadByUser.get(member.userId) ?? 0;
        const ping = latestPingByUser.get(member.userId);
        const distanceKm =
          referencePoint && ping
            ? Number(this.haversineKm(referencePoint, ping).toFixed(2))
            : null;

        const skillScore = skillMatch ? 45 : 15;
        const loadScore = Math.max(0, 35 - openOrders * 5);
        const distanceScore = distanceKm === null ? 10 : Math.max(0, 20 - Math.min(distanceKm, 20));
        const score = Number((skillScore + loadScore + distanceScore).toFixed(2));

        return {
          technicianId: member.userId,
          technicianName: member.user.fullName,
          teamId: member.teamId,
          distanceKm,
          openOrders,
          skillMatch,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      serviceOrderId: serviceOrder.id,
      referencePoint,
      recommendations
    };
  }

  async optimizeRoute(input: OptimizeRouteDto): Promise<{
    startPoint: GeoPoint | null;
    estimatedTotalDistanceKm: number;
    route: Array<{
      sequence: number;
      serviceOrderId: string;
      orderNumber: number;
      title: string;
      point: GeoPoint;
      distanceFromPreviousKm: number;
    }>;
  }> {
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        id: { in: input.serviceOrderIds },
        deletedAt: null
      },
      select: {
        id: true,
        orderNumber: true,
        title: true,
        locationAddressId: true
      }
    });
    if (!orders.length) {
      throw new NotFoundException('Nenhuma ordem valida foi encontrada para roteirizacao');
    }

    const points = await Promise.all(
      orders.map(async (order) => {
        const point = await this.resolveServiceOrderPoint(order.id, order.locationAddressId);
        return point
          ? {
              order,
              point
            }
          : null;
      })
    );
    const validPoints = points.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (!validPoints.length) {
      throw new NotFoundException('Nenhuma OS possui coordenada valida para otimizar rota');
    }

    const technicianStart = input.technicianId
      ? await this.resolveTechnicianStartPoint(input.technicianId)
      : null;
    const explicitStart =
      input.startLatitude !== undefined && input.startLongitude !== undefined
        ? { latitude: input.startLatitude, longitude: input.startLongitude }
        : null;
    const startPoint = explicitStart ?? technicianStart ?? validPoints[0].point;

    const remaining = [...validPoints];
    const route: Array<{
      sequence: number;
      serviceOrderId: string;
      orderNumber: number;
      title: string;
      point: GeoPoint;
      distanceFromPreviousKm: number;
    }> = [];

    let currentPoint = startPoint;
    let totalDistance = 0;
    let sequence = 1;

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < remaining.length; i += 1) {
        const distance = this.haversineKm(currentPoint, remaining[i].point);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }

      const next = remaining.splice(bestIndex, 1)[0];
      totalDistance += bestDistance;
      route.push({
        sequence,
        serviceOrderId: next.order.id,
        orderNumber: next.order.orderNumber,
        title: next.order.title,
        point: next.point,
        distanceFromPreviousKm: Number(bestDistance.toFixed(2))
      });
      currentPoint = next.point;
      sequence += 1;
    }

    return {
      startPoint,
      estimatedTotalDistanceKm: Number(totalDistance.toFixed(2)),
      route
    };
  }

  private async resolveServiceOrderPoint(
    serviceOrderId: string,
    locationAddressId: string | null
  ): Promise<GeoPoint | null> {
    const geo = await this.prisma.serviceOrderGeoLocation.findUnique({
      where: { serviceOrderId }
    });
    if (geo) {
      return {
        latitude: Number(geo.latitude),
        longitude: Number(geo.longitude)
      };
    }

    if (!locationAddressId) {
      return null;
    }

    const address = await this.prisma.address.findUnique({
      where: { id: locationAddressId },
      select: { latitude: true, longitude: true }
    });
    if (!address?.latitude || !address?.longitude) {
      return null;
    }

    return {
      latitude: Number(address.latitude),
      longitude: Number(address.longitude)
    };
  }

  private async resolveTechnicianStartPoint(technicianId: string): Promise<GeoPoint | null> {
    const latest = await this.prisma.technicianLocationPing.findFirst({
      where: { userId: technicianId },
      orderBy: { createdAt: 'desc' }
    });
    if (!latest) {
      return null;
    }

    return {
      latitude: Number(latest.latitude),
      longitude: Number(latest.longitude)
    };
  }

  private haversineKm(a: GeoPoint, b: GeoPoint): number {
    const r = 6371;
    const dLat = this.deg2rad(b.latitude - a.latitude);
    const dLon = this.deg2rad(b.longitude - a.longitude);
    const lat1 = this.deg2rad(a.latitude);
    const lat2 = this.deg2rad(b.latitude);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return r * c;
  }

  private deg2rad(value: number): number {
    return value * (Math.PI / 180);
  }
}
