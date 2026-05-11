import { Injectable } from '@nestjs/common';

import type {
  ChecklistTemplateInputDto,
  RiskEstimationInputDto,
  RoutePlanInputDto,
  SlaPlanInputDto,
  TriageScoreInputDto,
  WorkloadBalancingInputDto
} from '../dto/operations-tools.dto';

type ChecklistItem = { id: string; title: string; required: boolean };

@Injectable()
export class OperationsToolsService {
  triageScore(input: TriageScoreInputDto): Record<string, unknown> {
    const effortPenalty = Math.min(input.effortHours ?? 0, 24) * 0.3;
    const rawScore = input.impact * 0.6 + input.urgency * 0.9 - effortPenalty / 10;
    const normalized = Math.max(1, Math.min(5, Number(rawScore.toFixed(2))));
    const priority =
      normalized >= 4.2 ? 'P1' : normalized >= 3.4 ? 'P2' : normalized >= 2.6 ? 'P3' : 'P4';
    const suggestedResponseSlaHours =
      priority === 'P1' ? 1 : priority === 'P2' ? 4 : priority === 'P3' ? 8 : 24;
    const suggestedResolutionSlaHours =
      priority === 'P1' ? 4 : priority === 'P2' ? 12 : priority === 'P3' ? 24 : 72;

    return {
      score: normalized,
      priority,
      suggestedResponseSlaHours,
      suggestedResolutionSlaHours
    };
  }

  checklistTemplate(input: ChecklistTemplateInputDto): Record<string, unknown> {
    const templates: Record<ChecklistTemplateInputDto['serviceCategory'], ChecklistItem[]> = {
      INSTALLATION: [
        { id: 'i01', title: 'Validar escopo e janela de execucao', required: true },
        { id: 'i02', title: 'Conferir material e ferramental', required: true },
        { id: 'i03', title: 'Registrar fotos antes e depois', required: true },
        { id: 'i04', title: 'Executar teste de aceite com cliente', required: true }
      ],
      CORRECTIVE: [
        { id: 'c01', title: 'Coletar sintomas e impacto reportado', required: true },
        { id: 'c02', title: 'Aplicar checklist de seguranca', required: true },
        { id: 'c03', title: 'Executar diagnostico tecnico', required: true },
        { id: 'c04', title: 'Registrar causa provavel e acao aplicada', required: true }
      ],
      PREVENTIVE: [
        { id: 'p01', title: 'Confirmar plano de manutencao', required: true },
        { id: 'p02', title: 'Executar inspecao por pontos criticos', required: true },
        { id: 'p03', title: 'Atualizar medicoes e parametros', required: true },
        { id: 'p04', title: 'Emitir relatorio de conformidade', required: true }
      ],
      INSPECTION: [
        { id: 'n01', title: 'Confirmar criterio normativo aplicavel', required: true },
        { id: 'n02', title: 'Registrar evidencias com geolocalizacao', required: true },
        { id: 'n03', title: 'Classificar nao conformidades', required: true },
        { id: 'n04', title: 'Publicar parecer tecnico', required: true }
      ],
      PROJECT: [
        { id: 'r01', title: 'Validar cronograma e dependencias', required: true },
        { id: 'r02', title: 'Mapear riscos de implantacao', required: true },
        { id: 'r03', title: 'Registrar marcos de entrega', required: true },
        { id: 'r04', title: 'Executar handover operacional', required: true }
      ]
    };

    return {
      category: input.serviceCategory,
      checklist: templates[input.serviceCategory]
    };
  }

  slaPlan(input: SlaPlanInputDto): Record<string, unknown> {
    const openedAt = new Date(input.openedAt);
    const responseDueAt = new Date(openedAt.getTime() + input.responseTargetHours * 60 * 60 * 1000);
    const resolutionDueAt = new Date(
      openedAt.getTime() + input.resolutionTargetHours * 60 * 60 * 1000
    );

    return {
      openedAt: openedAt.toISOString(),
      responseDueAt: responseDueAt.toISOString(),
      resolutionDueAt: resolutionDueAt.toISOString(),
      responseTargetHours: input.responseTargetHours,
      resolutionTargetHours: input.resolutionTargetHours
    };
  }

  workloadBalancing(input: WorkloadBalancingInputDto): Record<string, unknown> {
    const technicians = input.technicians.map((t) => ({
      ...t,
      projectedLoadHours: t.currentLoadHours
    }));

    const sortedOrders = [...input.workOrders].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.estimatedHours - a.estimatedHours;
    });

    const assignments: Array<Record<string, unknown>> = [];
    const unassigned: string[] = [];

    for (const workOrder of sortedOrders) {
      const candidates = technicians.filter((tech) =>
        workOrder.requiredSkills.every((requiredSkill) => tech.skills.includes(requiredSkill))
      );

      if (candidates.length === 0) {
        unassigned.push(workOrder.id);
        continue;
      }

      candidates.sort((a, b) => {
        const loadA = a.projectedLoadHours / a.weeklyCapacityHours;
        const loadB = b.projectedLoadHours / b.weeklyCapacityHours;
        return loadA - loadB;
      });

      const selected = candidates[0];
      selected.projectedLoadHours += workOrder.estimatedHours;
      assignments.push({
        workOrderId: workOrder.id,
        technicianId: selected.id,
        technicianName: selected.name,
        projectedUtilizationPercent: Number(
          ((selected.projectedLoadHours / selected.weeklyCapacityHours) * 100).toFixed(2)
        )
      });
    }

    return {
      assignments,
      unassigned,
      techniciansSummary: technicians.map((t) => ({
        id: t.id,
        name: t.name,
        projectedLoadHours: t.projectedLoadHours,
        projectedUtilizationPercent: Number(
          ((t.projectedLoadHours / t.weeklyCapacityHours) * 100).toFixed(2)
        )
      }))
    };
  }

  routePlan(input: RoutePlanInputDto): Record<string, unknown> {
    const avgSpeed = input.averageSpeedKmh ?? 35;
    const remaining = [...input.stops];
    const orderedStops: Array<Record<string, unknown>> = [];

    let currentLat = input.startLatitude;
    let currentLng = input.startLongitude;
    let accumulatedKm = 0;
    let accumulatedMinutes = 0;

    while (remaining.length > 0) {
      remaining.sort((a, b) => {
        const d1 = this.distanceKm(currentLat, currentLng, a.latitude, a.longitude);
        const d2 = this.distanceKm(currentLat, currentLng, b.latitude, b.longitude);
        return d1 - d2;
      });

      const next = remaining.shift();
      if (!next) break;

      const distanceKm = this.distanceKm(currentLat, currentLng, next.latitude, next.longitude);
      const travelMinutes = (distanceKm / avgSpeed) * 60;
      accumulatedKm += distanceKm;
      accumulatedMinutes += travelMinutes + next.serviceMinutes;

      orderedStops.push({
        stopId: next.id,
        latitude: next.latitude,
        longitude: next.longitude,
        travelDistanceKm: Number(distanceKm.toFixed(2)),
        travelMinutes: Number(travelMinutes.toFixed(1)),
        serviceMinutes: next.serviceMinutes,
        cumulativeMinutes: Number(accumulatedMinutes.toFixed(1))
      });

      currentLat = next.latitude;
      currentLng = next.longitude;
    }

    return {
      orderedStops,
      totalDistanceKm: Number(accumulatedKm.toFixed(2)),
      totalExecutionMinutes: Number(accumulatedMinutes.toFixed(1)),
      averageSpeedKmh: avgSpeed
    };
  }

  riskEstimation(input: RiskEstimationInputDto): Record<string, unknown> {
    const backlogFactor = Math.min(input.backlogSize / 50, 1) * 20;
    const overdueFactor = Math.min(input.overdueCount / 20, 1) * 25;
    const resolutionFactor = Math.min(input.avgResolutionHours / 72, 1) * 20;
    const reopenFactor = (input.reopenRatePercent / 100) * 20;
    const firstTimeFixProtection = ((100 - input.firstTimeFixRatePercent) / 100) * 10;
    const availabilityProtection = ((100 - input.teamAvailabilityPercent) / 100) * 15;

    const riskScore = Number(
      Math.min(
        100,
        backlogFactor +
          overdueFactor +
          resolutionFactor +
          reopenFactor +
          firstTimeFixProtection +
          availabilityProtection
      ).toFixed(2)
    );

    const level = riskScore >= 75 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

    const recommendations = [
      ...(input.overdueCount > 0 ? ['Criar mutirao para ordens vencidas nas proximas 24h'] : []),
      ...(input.reopenRatePercent > 10 ? ['Executar revisao tecnica de causa raiz nos 10 principais reabertos'] : []),
      ...(input.teamAvailabilityPercent < 85 ? ['Ajustar escala com cobertura de contingencia'] : []),
      ...(riskScore >= 50 ? ['Ativar comite operacional diario com monitoramento de SLA'] : [])
    ];

    return {
      riskScore,
      level,
      recommendations
    };
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthKm * c;
  }
}
