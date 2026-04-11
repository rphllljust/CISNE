import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import { ListNotificationsQueryDto } from '../../application/dto/list-notifications-query.dto';
import { MarkNotificationReadDto } from '../../application/dto/mark-notification-read.dto';
import { NotificationsService } from '../../application/services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lista notificacoes internas do usuario autenticado' })
  async listForMe(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: ListNotificationsQueryDto
  ): Promise<unknown> {
    return this.notificationsService.listForUser(user.sub, query);
  }

  @Patch('me/read')
  @ApiOperation({ summary: 'Marca notificacao como lida' })
  async markRead(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: MarkNotificationReadDto
  ): Promise<{ message: string }> {
    await this.notificationsService.markAsRead(user.sub, dto.notificationId);
    return { message: 'Notificacao marcada como lida' };
  }
}
