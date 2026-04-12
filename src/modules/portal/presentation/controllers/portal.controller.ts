import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../../common/decorators/public.decorator';
import { ListKnowledgeArticlesQueryDto } from '../../../knowledge-base/application/dto/knowledge-articles.dto';
import { CreatePortalTicketDto, PortalTrackTicketQueryDto } from '../../application/dto/portal.dto';
import { PortalService } from '../../application/services/portal.service';

@ApiTags('Portal')
@Public()
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Abertura publica de chamado no portal de autoatendimento' })
  async openTicket(@Body() dto: CreatePortalTicketDto): Promise<unknown> {
    return this.portalService.openTicket(dto);
  }

  @Get('tickets/:trackingCode')
  @ApiOperation({ summary: 'Acompanhamento publico de chamado por protocolo + e-mail' })
  async trackTicket(
    @Param('trackingCode') trackingCode: string,
    @Query() query: PortalTrackTicketQueryDto
  ): Promise<unknown> {
    return this.portalService.trackTicket(trackingCode, query.email);
  }

  @Get('knowledge/articles')
  @ApiOperation({ summary: 'Lista publica de artigos da base de conhecimento' })
  async listPublicArticles(@Query() query: ListKnowledgeArticlesQueryDto): Promise<unknown> {
    return this.portalService.listPublicArticles(query);
  }

  @Get('knowledge/articles/:slug')
  @ApiOperation({ summary: 'Detalhe publico de artigo por slug' })
  async getPublicArticle(@Param('slug') slug: string): Promise<unknown> {
    return this.portalService.getPublicArticle(slug);
  }
}
