import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para logging detalhado de transações NFS-e
 */
@Injectable()
export class NfseLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('NfseTransaction');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || this.gerarCorrelationId();

    req.headers['x-correlation-id'] = correlationId as string;

    this.logger.log(`[${correlationId}] INÍCIO ${method} ${originalUrl}`);

    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`[${correlationId}] Body: ${JSON.stringify(body)}`);
    }

    const originalSend = res.send;
    const logger = this.logger;

    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      logger.log(
        `[${correlationId}] FIM ${method} ${originalUrl} - Status: ${statusCode} - Duração: ${duration}ms`
      );

      if (statusCode >= 400) {
        logger.error(
          `[${correlationId}] Erro na transação: ${statusCode} - ${typeof data === 'string' ? data : JSON.stringify(data)}`
        );
      }

      return originalSend.call(this, data);
    };

    next();
  }

  private gerarCorrelationId(): string {
    return `nfse-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
