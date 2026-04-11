import { Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';

@Injectable()
export class NotificationsService {
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
}
