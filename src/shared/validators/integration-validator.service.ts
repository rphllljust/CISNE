import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Serviço centralizado de validação de integridade referencial
 * Evita problemas de dependência entre módulos
 */
@Injectable()
export class IntegrationValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validar se Cliente é válido para operação
   */
  async validateClient(clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        deletedAt: null,
        active: true
      }
    });

    if (!client) {
      throw new NotFoundException(
        'Cliente não encontrado ou inativo. Verifique o ID e status.'
      );
    }
  }

  /**
   * Validar se ServiceType é válido para operação
   */
  async validateServiceType(serviceTypeId: string): Promise<void> {
    const serviceType = await this.prisma.serviceType.findFirst({
      where: {
        id: serviceTypeId,
        active: true
      }
    });

    if (!serviceType) {
      throw new NotFoundException(
        'Tipo de Serviço não encontrado ou inativo. Verifique o ID e status.'
      );
    }
  }

  /**
   * Validar se User é válido para operação
   */
  async validateUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado ou inativo. Verifique o ID e status.'
      );
    }
  }

  /**
   * Validar se Técnico está em Time (compatibilidade)
   */
  async validateTechnicianInTeam(
    technicianId: string,
    teamId: string
  ): Promise<void> {
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId: technicianId,
        teamId: teamId,
        active: true
      },
      include: { user: true, team: true }
    });

    if (!teamMember) {
      throw new BadRequestException(
        'Técnico não está vinculado ao time informado. ' +
        'Verifique a compatibilidade ou vincule o técnico ao time primeiro.'
      );
    }

    if (teamMember.user?.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Técnico inativo. Ative o usuário antes de atribuir.'
      );
    }

    if (teamMember.team?.active !== true) {
      throw new BadRequestException(
        'Time inativo. Ative o time antes de usar.'
      );
    }
  }

  /**
   * Validar se Team é válido para operação
   */
  async validateTeam(teamId: string): Promise<void> {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        active: true
      }
    });

    if (!team) {
      throw new NotFoundException(
        'Time não encontrado ou inativo. Verifique o ID e status.'
      );
    }
  }

  /**
   * Validar se Address pertence ao Client
   */
  async validateAddressBelongsToClient(
    addressId: string,
    clientId: string
  ): Promise<void> {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        clientId: clientId
      }
    });

    if (!address) {
      throw new BadRequestException(
        'Endereço não encontrado ou não pertence a este cliente. ' +
        'Verifique o ID do endereço.'
      );
    }
  }

  /**
   * Validar se Contract é válido e ativo
   */
  async validateContract(
    contractId: string,
    clientId?: string
  ): Promise<void> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        status: 'ACTIVE',
        ...(clientId && { clientId })
      }
    });

    if (!contract) {
      throw new BadRequestException(
        'Contrato não encontrado, inativo ou não pertence a este cliente. ' +
        'Verifique o ID e status do contrato.'
      );
    }
  }

  /**
   * Validar se SLA é válido e ativo
   */
  async validateSLA(slaId: string): Promise<void> {
    const sla = await this.prisma.sLA.findFirst({
      where: {
        id: slaId,
        active: true
      }
    });

    if (!sla) {
      throw new NotFoundException(
        'SLA não encontrado ou inativo. Verifique o ID e status.'
      );
    }
  }

  /**
   * Validar se Asset é válido
   */
  async validateAsset(
    assetId: string,
    clientId?: string
  ): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        active: true,
        deletedAt: null,
        OR: clientId ? [{ clientId }, { clientId: null }] : undefined
      }
    });

    if (!asset) {
      throw new NotFoundException(
        'Ativo não encontrado ou inativo. ' +
        (clientId ? 'Verifique se pertence a este cliente.' : '')
      );
    }

    if (asset.clientId && clientId && asset.clientId !== clientId) {
      throw new BadRequestException(
        'Ativo pertence a outro cliente e não pode ser vinculado.'
      );
    }
  }

  /**
   * Validar valores financeiros de Invoice
   */
  validateInvoiceAmounts(
    grossAmount: number | undefined,
    estimatedValue: number | undefined,
    discountAmount: number = 0,
    taxAmount: number = 0
  ): { grossAmount: number; netAmount: number } {
    const resolvedGrossAmount = grossAmount ?? estimatedValue;

    if (!resolvedGrossAmount || resolvedGrossAmount <= 0) {
      throw new BadRequestException(
        'Valor bruto inválido. Deve ser maior que zero. ' +
        'Forneça grossAmount ou certifique-se de que estimatedValue está preenchido na Ordem de Serviço.'
      );
    }

    if (discountAmount < 0 || discountAmount > resolvedGrossAmount) {
      throw new BadRequestException(
        'Desconto inválido. Deve estar entre 0 e valor bruto.'
      );
    }

    if (taxAmount < 0) {
      throw new BadRequestException(
        'Imposto inválido. Deve ser maior ou igual a zero.'
      );
    }

    const netAmount = resolvedGrossAmount - discountAmount + taxAmount;
    if (netAmount <= 0) {
      throw new BadRequestException(
        'Valor líquido inválido. ' +
        'Verifique se desconto não é maior que (bruto + imposto).'
      );
    }

    return { grossAmount: resolvedGrossAmount, netAmount };
  }

  /**
   * Validar se ServiceOrder pode emitir Invoice
   */
  async validateServiceOrderForInvoice(
    serviceOrderId: string
  ): Promise<{ estimatedValue: number | null; clientId: string; status: string }> {
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: {
        id: true,
        status: true,
        estimatedValue: true,
        clientId: true,
        deletedAt: true
      }
    });

    if (!serviceOrder || serviceOrder.deletedAt) {
      throw new NotFoundException(
        'Ordem de Serviço não encontrada ou deletada.'
      );
    }

    if (serviceOrder.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Nota Fiscal só pode ser emitida para OS com status COMPLETED. ` +
        `Status atual: ${serviceOrder.status}. ` +
        `Complete a Ordem de Serviço antes de emitir a Nota Fiscal.`
      );
    }

    return {
      estimatedValue: serviceOrder.estimatedValue
        ? Number(serviceOrder.estimatedValue.toString())
        : null,
      clientId: serviceOrder.clientId,
      status: serviceOrder.status
    };
  }

  /**
   * Validar se Invoice já existe para ServiceOrder
   */
  async validateInvoiceNotExists(serviceOrderId: string): Promise<void> {
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: {
        serviceOrderId: serviceOrderId
      }
    });

    if (existingInvoice) {
      throw new BadRequestException(
        'Já existe uma Nota Fiscal para esta Ordem de Serviço. ' +
        'Uma ServiceOrder só pode gerar uma Nota Fiscal. ' +
        `Invoice ID: ${existingInvoice.id}`
      );
    }
  }

  /**
   * Validar compatibilidade Contrato-Cliente
   */
  async validateContractMatchesClient(
    contractId: string,
    clientId: string
  ): Promise<void> {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        clientId: clientId,
        status: 'ACTIVE'
      }
    });

    if (!contract) {
      throw new BadRequestException(
        'Contrato não pertence a este cliente ou está inativo. ' +
        'Verifique o ID do contrato ou associe um contrato válido.'
      );
    }
  }

  /**
   * Validar se ServiceOrder pode mudar de status
   */
  validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      'OPEN': ['UNDER_ANALYSIS', 'CANCELED'],
      'UNDER_ANALYSIS': ['WAITING_APPROVAL', 'OPEN', 'CANCELED'],
      'WAITING_APPROVAL': ['SCHEDULED', 'OPEN', 'CANCELED'],
      'SCHEDULED': ['IN_TRANSIT', 'CANCELED', 'PAUSED'],
      'IN_TRANSIT': ['IN_PROGRESS', 'WAITING_PARTS', 'WAITING_CUSTOMER', 'PAUSED', 'CANCELED'],
      'IN_PROGRESS': ['COMPLETED', 'PAUSED', 'WAITING_PARTS', 'WAITING_CUSTOMER', 'CANCELED'],
      'PAUSED': ['IN_PROGRESS', 'WAITING_PARTS', 'CANCELED'],
      'WAITING_PARTS': ['IN_PROGRESS', 'PAUSED', 'CANCELED'],
      'WAITING_CUSTOMER': ['IN_PROGRESS', 'PAUSED', 'CANCELED'],
      'COMPLETED': ['REOPENED'],
      'REOPENED': ['IN_PROGRESS', 'CANCELED'],
      'CANCELED': []
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Transição inválida de ${currentStatus} para ${newStatus}. ` +
        `Transições permitidas: ${allowedTransitions.join(', ')}.`
      );
    }
  }

  /**
   * Validar Schedule com Técnico e Time compatíveis
   */
  async validateScheduleCompatibility(
    technicianId?: string,
    teamId?: string
  ): Promise<void> {
    if (!technicianId && !teamId) {
      return; // Ambos opcionais
    }

    if (technicianId && teamId) {
      // Se ambos fornecidos, validar compatibilidade
      await this.validateTechnicianInTeam(technicianId, teamId);
    } else if (technicianId) {
      // Se só técnico, validar se está ativo e vinculado a algum time
      const user = await this.prisma.user.findFirst({
        where: { id: technicianId, status: 'ACTIVE', deletedAt: null }
      });

      if (!user) {
        throw new BadRequestException('Técnico não encontrado ou inativo.');
      }

      const teamMember = await this.prisma.teamMember.findFirst({
        where: {
          userId: technicianId,
          active: true
        }
      });

      if (!teamMember) {
        throw new BadRequestException(
          'Técnico não está vinculado a nenhum time. ' +
          'Vincule o técnico a um time antes de agendá-lo.'
        );
      }
    } else if (teamId) {
      // Se só time, validar se está ativo
      await this.validateTeam(teamId);
    }
  }
}
