import { Injectable, Logger, NestInterceptor, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl: string; user?: { sub: string } }>();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<{ statusCode: number }>();

        this.logger.log({
          event: 'http_request_completed',
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Date.now() - now,
          userId: request.user?.sub
        });
      })
    );
  }
}
