import { Injectable, Logger, NestInterceptor, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);
  private readonly sensitiveKeys = ['password', 'token', 'secret', 'authorization'];

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const source = body as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      result[key] = this.sensitiveKeys.some((s) => key.toLowerCase().includes(s))
        ? '[REDACTED]'
        : value;
    }
    return result;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      headers: Record<string, string | undefined>;
      body?: unknown;
      user?: { sub: string };
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number; setHeader: (k: string, v: string) => void }>();
    const requestId = request.headers['x-request-id'] ?? randomUUID();
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            event: 'http_request_completed',
            requestId,
            method: request.method,
            route: request.originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - now,
            userId: request.user?.sub,
            payload: this.sanitizeBody(request.body)
          });
        },
        error: (error: unknown) => {
          const err = error as { message?: string; name?: string };
          this.logger.error({
            event: 'http_request_failed',
            requestId,
            method: request.method,
            route: request.originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - now,
            userId: request.user?.sub,
            errorName: err?.name,
            errorMessage: err?.message
          });
        }
      })
    );
  }
}
