import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig>
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check da API' })
  async getHealth(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    environment: string;
    version: string;
    checks: {
      api: 'up';
      database: 'up' | 'down';
    };
  }> {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', { infer: true }) ?? 'unknown',
      version: this.configService.get('APP_VERSION', { infer: true }) ?? '0.0.0',
      checks: {
        api: 'up',
        database
      }
    };
  }
}
