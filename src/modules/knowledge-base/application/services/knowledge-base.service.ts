import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { KnowledgeArticleStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import type { JwtUserPayload } from '../../../auth/domain/interfaces/jwt-user-payload.interface';
import {
  CreateKnowledgeArticleDto,
  ListKnowledgeArticlesQueryDto,
  PublishKnowledgeArticleDto,
  UpdateKnowledgeArticleDto
} from '../dto/knowledge-articles.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async create(
    dto: CreateKnowledgeArticleDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const slug = (dto.slug ?? this.slugify(dto.title)).toLowerCase();
    await this.ensureSlugAvailable(slug);

    const created = await this.prisma.knowledgeArticle.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        content: dto.content,
        status: dto.status,
        tags: dto.tags ?? [],
        serviceTypeId: dto.serviceTypeId,
        authorId: actor.sub,
        publishedAt: dto.status === KnowledgeArticleStatus.PUBLISHED ? new Date() : undefined
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      resource: 'knowledge_article',
      resourceId: created.id
    });

    return created;
  }

  async findAll(query: ListKnowledgeArticlesQueryDto): Promise<{
    items: Record<string, unknown>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: Prisma.KnowledgeArticleWhereInput = {
      deletedAt: null,
      ...(query.publishedOnly ? { status: KnowledgeArticleStatus.PUBLISHED } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceTypeId ? { serviceTypeId: query.serviceTypeId } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { summary: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.knowledgeArticle.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: this.buildOrderBy(query.sort)
      }),
      this.prisma.knowledgeArticle.count({ where })
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

  async findById(id: string): Promise<Record<string, unknown>> {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id, deletedAt: null }
    });
    if (!article) {
      throw new NotFoundException('Artigo nao encontrado');
    }
    return article;
  }

  async findPublicBySlug(slug: string): Promise<Record<string, unknown>> {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: {
        slug: slug.toLowerCase(),
        status: KnowledgeArticleStatus.PUBLISHED,
        deletedAt: null
      }
    });
    if (!article) {
      throw new NotFoundException('Artigo nao encontrado');
    }
    return article;
  }

  async update(
    id: string,
    dto: UpdateKnowledgeArticleDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException('Artigo nao encontrado');
    }

    let resolvedSlug = dto.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      resolvedSlug = dto.slug.toLowerCase();
      await this.ensureSlugAvailable(resolvedSlug);
    }

    const updated = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        title: dto.title,
        slug: resolvedSlug,
        summary: dto.summary,
        content: dto.content,
        status: dto.status,
        tags: dto.tags,
        serviceTypeId: dto.serviceTypeId,
        version: { increment: 1 },
        publishedAt:
          dto.status === KnowledgeArticleStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : undefined
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'KNOWLEDGE_ARTICLE_UPDATED',
      resource: 'knowledge_article',
      resourceId: id
    });

    return updated;
  }

  async publish(
    id: string,
    dto: PublishKnowledgeArticleDto,
    actor: JwtUserPayload
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.knowledgeArticle.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException('Artigo nao encontrado');
    }

    const published = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        status: KnowledgeArticleStatus.PUBLISHED,
        reviewerId: dto.reviewerId ?? actor.sub,
        publishedAt: new Date(),
        version: { increment: 1 }
      }
    });

    await this.auditService.register({
      actorId: actor.sub,
      action: 'KNOWLEDGE_ARTICLE_PUBLISHED',
      resource: 'knowledge_article',
      resourceId: id
    });

    return published;
  }

  private buildOrderBy(sort?: string): Prisma.KnowledgeArticleOrderByWithRelationInput {
    if (!sort) {
      return { updatedAt: 'desc' };
    }

    const [field, direction] = sort.split(':');
    const allowedFields = new Set(['createdAt', 'updatedAt', 'publishedAt', 'title', 'status']);
    const safeField = allowedFields.has(field) ? field : 'updatedAt';
    const safeDirection: Prisma.SortOrder = direction === 'asc' ? 'asc' : 'desc';

    return { [safeField]: safeDirection } as Prisma.KnowledgeArticleOrderByWithRelationInput;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    const existing = await this.prisma.knowledgeArticle.findUnique({
      where: { slug },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Slug ja utilizado por outro artigo');
    }
  }
}
