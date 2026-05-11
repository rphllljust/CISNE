import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AuthThrottlerGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request & { body?: { email?: string; token?: string } };
    const path = request.path ?? '';
    const method = request.method ?? 'GET';
    const ip = request.ip ?? 'unknown-ip';
    const userAgent = String(request.headers['user-agent'] ?? 'unknown-ua');

    if (method === 'POST' && path.endsWith('/auth/login')) {
      const email = String(request.body?.email ?? '').trim().toLowerCase();
      return `auth-login:${ip}:${email}:${userAgent}`;
    }
    if (method === 'POST' && path.endsWith('/auth/forgot-password')) {
      const email = String(request.body?.email ?? '').trim().toLowerCase();
      return `auth-forgot:${ip}:${email}:${userAgent}`;
    }
    if (method === 'POST' && path.endsWith('/auth/reset-password')) {
      const tokenPrefix = String(request.body?.token ?? '').split('.')[0] ?? 'no-token';
      return `auth-reset:${ip}:${tokenPrefix}:${userAgent}`;
    }
    if (method === 'POST' && path.endsWith('/auth/refresh')) {
      return `auth-refresh:${ip}:${userAgent}`;
    }

    return ip;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const request = context.switchToHttp().getRequest() as Request;
    this.logger.warn({
      event: 'AUTH_RATE_LIMIT_EXCEEDED',
      path: request.path,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
