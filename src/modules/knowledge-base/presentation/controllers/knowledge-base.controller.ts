import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateKnowledgeArticleDto,
  ListKnowledgeArticlesQueryDto,
  PublishKnowledgeArticleDto,
  UpdateKnowledgeArticleDto
} from '../../application/dto/knowledge-articles.dto';
import { KnowledgeBaseService } from '../../application/services/knowledge-base.service';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post('articles')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Cria artigo da base de conhecimento' })
  async create(
    @Body() dto: CreateKnowledgeArticleDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.knowledgeBaseService.create(dto, actor);
  }

  @Get('articles')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Lista artigos da base de conhecimento' })
  async findAll(@Query() query: ListKnowledgeArticlesQueryDto): Promise<unknown> {
    return this.knowledgeBaseService.findAll(query);
  }

  @Get('articles/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'ATTENDANT')
  @ApiOperation({ summary: 'Detalha artigo por id' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.knowledgeBaseService.findById(id);
  }

  @Patch('articles/:id')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'TECHNICIAN')
  @ApiOperation({ summary: 'Atualiza artigo da base de conhecimento' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeArticleDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.knowledgeBaseService.update(id, dto, actor);
  }

  @Post('articles/:id/publish')
  @Roles('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR')
  @ApiOperation({ summary: 'Publica artigo para consumo interno/portal' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishKnowledgeArticleDto,
    @CurrentUser() actor: JwtUserPayload
  ): Promise<unknown> {
    return this.knowledgeBaseService.publish(id, dto, actor);
  }

  @Public()
  @Get('public/articles')
  @ApiOperation({ summary: 'Lista publica de artigos publicados' })
  async listPublic(@Query() query: ListKnowledgeArticlesQueryDto): Promise<unknown> {
    return this.knowledgeBaseService.findAll({
      ...query,
      publishedOnly: true
    });
  }

  @Public()
  @Get('public/articles/:slug')
  @ApiOperation({ summary: 'Detalhe publico de artigo por slug' })
  async findPublicBySlug(@Param('slug') slug: string): Promise<unknown> {
    return this.knowledgeBaseService.findPublicBySlug(slug);
  }
}
