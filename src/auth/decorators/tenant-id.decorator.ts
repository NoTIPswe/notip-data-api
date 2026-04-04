import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantAwareRequest } from '../interfaces/tenant-access-context.interface';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantAwareRequest>();
    return request.tenantAccess?.tenantId;
  },
);
