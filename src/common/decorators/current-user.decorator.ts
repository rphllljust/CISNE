import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { JwtUserPayload } from '../../modules/auth/domain/interfaces/jwt-user-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUserPayload }>();
    return request.user;
  }
);
