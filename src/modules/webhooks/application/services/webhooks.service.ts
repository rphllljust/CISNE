import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { Prisma, WebhookDeliveryStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateWebhookSubscriptionDto,
  ListWebhookSubscriptionQueryDto,
  UpdateWebhookSubscriptionDto
} from '../dto/webhooks.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createSubscription(
    dto: CreateWebhookSubscriptionDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const created = await this.prisma.webhookSubscription.create({
      data: {
        eventType: dto.eventType.trim(),
        targetUrl: dto.targetUrl,
        secret: dto.secret,
        isActive: dto.isActive,
        timeoutSeconds: dto.timeoutSeconds,
        maxRetries: dto.maxRetries
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'WEBHOOK_SUBSCRIPTION_CREATED',
      resource: 'webhook_subscription',
      resourceId: created.id
    });

    return created;
  }

  async listSubscriptions(query: ListWebhookSubscriptionQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.WebhookSubscriptionWhereInput = {
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.webhookSubscription.findMany({
        where,
        include: {
          deliveries: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.webhookSubscription.count({ where })
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

  async updateSubscription(
    id: string,
    dto: UpdateWebhookSubscriptionDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const updated = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        eventType: dto.eventType?.trim(),
        targetUrl: dto.targetUrl,
        secret: dto.secret,
        isActive: dto.isActive,
        timeoutSeconds: dto.timeoutSeconds,
        maxRetries: dto.maxRetries
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'WEBHOOK_SUBSCRIPTION_UPDATED',
      resource: 'webhook_subscription',
      resourceId: id
    });

    return updated;
  }

  async deleteSubscription(id: string, actor: JwtUserPayload): Promise<void> {
    await this.prisma.webhookSubscription.delete({
      where: { id }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'WEBHOOK_SUBSCRIPTION_DELETED',
      resource: 'webhook_subscription',
      resourceId: id
    });
  }

  async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const normalizedEventType = eventType.trim();
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        isActive: true,
        OR: [{ eventType: normalizedEventType }, { eventType: 'ALL' }]
      }
    });
    if (!subscriptions.length) {
      return;
    }

    await Promise.all(
      subscriptions.map((subscription) =>
        this.deliverWithRetry(subscription.id, normalizedEventType, payload)
      )
    );
  }

  private async deliverWithRetry(
    subscriptionId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId }
    });
    if (!subscription || !subscription.isActive) {
      return;
    }

    const bodyText = JSON.stringify({
      eventType,
      timestamp: new Date().toISOString(),
      payload
    });
    const payloadJson = this.toJsonValue(payload);

    for (let attempt = 1; attempt <= subscription.maxRetries; attempt += 1) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          subscriptionId: subscription.id,
          eventType,
          payload: payloadJson,
          status: WebhookDeliveryStatus.PENDING,
          attempt
        }
      });

      try {
        const timeoutMs = subscription.timeoutSeconds * 1000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventType,
          'X-Webhook-Delivery': delivery.id
        };

        if (subscription.secret) {
          headers['X-Webhook-Signature'] = this.signPayload(bodyText, subscription.secret);
        }

        const response = await fetch(subscription.targetUrl, {
          method: 'POST',
          headers,
          body: bodyText,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const responseText = await response.text();
        const isSuccess = response.status >= 200 && response.status < 300;

        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: isSuccess ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED,
            httpStatus: response.status,
            responseBody: responseText.slice(0, 4000),
            deliveredAt: isSuccess ? new Date() : null
          }
        });

        if (isSuccess) {
          return;
        }
      } catch (error) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.FAILED,
            errorMessage: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error'
          }
        });
      }
    }
  }

  private signPayload(payload: string, secret: string): string {
    const digest = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${digest}`;
  }

  private toJsonValue(payload: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }
}
