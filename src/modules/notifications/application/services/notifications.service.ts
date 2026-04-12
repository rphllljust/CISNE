import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';

/**
 * Templates de mensagem automatizada para WhatsApp/SMS (MÓDULO 4.1)
 * Usados nas notificações automáticas do fluxo de OS
 */
export const MESSAGE_TEMPLATES = {
  OS_ABERTA: (params: { cliente: string; os: string; categoria: string; data: string; link: string }) =>
    `Olá ${params.cliente}, sua Ordem de Serviço #${params.os} foi registrada.\nCategoria: ${params.categoria}\nData estimada: ${params.data}\nAcompanhe: ${params.link}`,

  SAIDA_TECNICO: (params: { tecnico: string; os: string; tempo: string; endereco: string }) =>
    `${params.tecnico} saiu para sua OS #${params.os}.\nTempo estimado: ${params.tempo} minutos\nLocalização: ${params.endereco}`,

  EM_ANDAMENTO: (params: { os: string; valor: string }) =>
    `Técnico iniciou o atendimento em sua OS #${params.os}.\nValor estimado: R$ ${params.valor}`,

  CONCLUSAO: (params: { os: string; tempo: string; valor: string }) =>
    `OS #${params.os} finalizada!\nTempo total: ${params.tempo}\nValor cobrado: R$ ${params.valor}\nPróximas etapas: Agendamento faturamento`,

  PAGAMENTO_PENDENTE: (params: { os: string; valor: string; link: string }) =>
    `Sua OS #${params.os} aguarda pagamento.\nValor: R$ ${params.valor}\nPagar agora: ${params.link}`,

  // Slack/Teams (equipe interna) - MÓDULO 4.2
  SLACK_NOVA_OS: (params: {
    cliente: string;
    endereco: string;
    categoria: string;
    data: string;
    valor: string;
  }) =>
    `🆕 Nova OS recebida\n👤 Cliente: ${params.cliente}\n📍 Localização: ${params.endereco}\n🔧 Serviço: ${params.categoria}\n⏰ Prazo: ${params.data}\n💰 Valor: R$ ${params.valor}`,

  SLACK_OS_ATRASO: (params: { os: string; tempo: string; status: string }) =>
    `⚠️ OS #${params.os} em atraso\n📌 SLA vencido em: ${params.tempo}\n🔴 Status: ${params.status}`,

  SLACK_FATURAMENTO: (params: { os: string; valor: string; link: string }) =>
    `✅ OS #${params.os} pronta para faturar\n💵 Valor: R$ ${params.valor}\n📄 NFS-e gerada: ${params.link}`
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query: ListNotificationsQueryDto): Promise<{
    items: unknown[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where = {
      userId,
      ...(query.status ? { status: query.status } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.notification.count({ where })
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

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  async createInternalNotification(input: {
    userId: string;
    title: string;
    message: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        status: 'PENDING',
        title: input.title,
        message: input.message,
        payload: input.payload as Prisma.InputJsonValue | undefined
      }
    });
  }

  /**
   * MÓDULO 4.1 - Enviar notificação WhatsApp/SMS automatizada
   * Registra a notificação e despacha via provedor externo (integração plugável)
   */
  async sendWhatsAppNotification(input: {
    userId?: string;
    phone: string;
    message: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    // Persiste a notificação
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        type: input.type,
        channel: NotificationChannel.WHATSAPP,
        status: 'PENDING',
        title: input.type,
        message: input.message,
        payload: this.buildChannelPayload(input.payload, { phone: input.phone })
      }
    });

    // Despachar via provedor (WhatsApp Business API)
    // A implementação real conecta à API configurada via env WHATSAPP_API_URL + WHATSAPP_API_TOKEN
    const sent = await this.dispatchWhatsApp(input.phone, input.message);

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: sent ? 'SENT' : 'FAILED', sentAt: sent ? new Date() : null }
    });
  }

  /**
   * MÓDULO 4.1 - Enviar SMS automatizado
   */
  async sendSmsNotification(input: {
    userId?: string;
    phone: string;
    message: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        type: input.type,
        channel: NotificationChannel.SMS,
        status: 'PENDING',
        title: input.type,
        message: input.message,
        payload: this.buildChannelPayload(input.payload, { phone: input.phone })
      }
    });

    const sent = await this.dispatchSms(input.phone, input.message);

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: sent ? 'SENT' : 'FAILED', sentAt: sent ? new Date() : null }
    });
  }

  /**
   * MÓDULO 4 - Notificar fluxo completo de OS por WhatsApp/SMS (templates prontos)
   * Disparado automaticamente nas transições de status
   */
  async notifyServiceOrderEvent(
    event: keyof typeof MESSAGE_TEMPLATES,
    params: Record<string, string>,
    phone: string,
    userId?: string
  ): Promise<void> {
    const templateFn = MESSAGE_TEMPLATES[event];
    if (!templateFn) {
      this.logger.warn(`Template de notificação não encontrado: ${event}`);
      return;
    }
    const message = (templateFn as (p: Record<string, string>) => string)(params);
    await this.sendWhatsAppNotification({
      userId,
      phone,
      message,
      type: event,
      payload: params
    });
  }

  // ─── Provedores externos (plugáveis via env) ────────────────────────────────

  private async dispatchWhatsApp(phone: string, message: string): Promise<boolean> {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    if (!apiUrl || !token) {
      this.logger.warn(`WhatsApp não configurado (WHATSAPP_API_URL/WHATSAPP_API_TOKEN ausentes). Mensagem para ${phone}: ${message.slice(0, 50)}...`);
      return false;
    }
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: phone, type: 'text', text: { body: message } })
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`Falha ao enviar WhatsApp para ${phone}: ${(err as Error).message}`);
      return false;
    }
  }

  private async dispatchSms(phone: string, message: string): Promise<boolean> {
    const apiUrl = process.env.SMS_API_URL;
    const token = process.env.SMS_API_TOKEN;
    if (!apiUrl || !token) {
      this.logger.warn(`SMS não configurado (SMS_API_URL/SMS_API_TOKEN ausentes). Mensagem para ${phone}: ${message.slice(0, 50)}...`);
      return false;
    }
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: phone, message })
      });
      return res.ok;
    } catch (err) {
      this.logger.error(`Falha ao enviar SMS para ${phone}: ${(err as Error).message}`);
      return false;
    }
  }

  private buildChannelPayload(
    payload: Record<string, unknown> | undefined,
    extra: Record<string, unknown>
  ): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify({ ...(payload ?? {}), ...extra })) as Prisma.InputJsonValue;
  }
}
