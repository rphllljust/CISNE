import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateWebhookSubscriptionDto,
  ListWebhookSubscriptionQueryDto,
  PublishWebhookEventDto,
  UpdateWebhookSubscriptionDto
} from '../../application/dto/webhooks.dto';
import { WebhooksService } from '../../application/services/webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('subscriptions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Cria assinatura de webhook para eventos operacionais' })
  async createSubscription(
    @Body() dto: CreateWebhookSubscriptionDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.webhooksService.createSubscription(dto, actor);
  }

  @Get('subscriptions')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Lista assinaturas e ultimas entregas' })
  async listSubscriptions(@Query() query: ListWebhookSubscriptionQueryDto): Promise<unknown> {
    return this.webhooksService.listSubscriptions(query);
  }

  @Patch('subscriptions/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Atualiza assinatura de webhook' })
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.webhooksService.updateSubscription(id, dto, actor);
  }

  @Delete('subscriptions/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Remove assinatura de webhook' })
  async deleteSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<{ message: string }> {
    await this.webhooksService.deleteSubscription(id, actor);
    return { message: 'Assinatura removida com sucesso' };
  }

  @Post('publish')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Publica evento manual para webhooks (teste/operacao)' })
  async publish(@Body() dto: PublishWebhookEventDto): Promise<{ message: string }> {
    await this.webhooksService.publishEvent(dto.eventType, dto.payload);
    return { message: 'Evento publicado para webhooks ativos' };
  }
}
