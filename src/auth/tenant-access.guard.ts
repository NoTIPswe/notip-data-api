import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TenantAccessContext,
  TenantAwareRequest,
  TenantStatus,
} from './interfaces/tenant-access-context.interface';

interface TenantStatusResponse {
  tenant_id: string;
  status: TenantStatus;
  read_only: boolean;
}

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    if (this.isPublicRequest(request)) {
      return true;
    }

    const authorization = request.headers.authorization;
    const bearerToken = this.extractBearerToken(authorization);

    if (!bearerToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const tenantAccess = await this.resolveTenantAccess(authorization!);
    request.tenantAccess = tenantAccess;

    if (tenantAccess.readOnly) {
      const method = request.method?.toUpperCase() ?? 'GET';
      if (!READ_ONLY_METHODS.has(method)) {
        throw new ForbiddenException('Tenant is suspended (read-only mode)');
      }
    }

    return true;
  }

  private isPublicRequest(request: TenantAwareRequest): boolean {
    const method = request.method?.toUpperCase() ?? 'GET';
    if (method === 'OPTIONS') {
      return true;
    }

    const path = (request.path ?? request.url ?? '').split('?')[0];
    return path === '/' || path === '/metrics';
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }

  private async resolveTenantAccess(
    authorization: string,
  ): Promise<TenantAccessContext> {
    const managementApiUrl = this.configService.get<string>(
      'MGMT_API_URL',
      'https://management-api:3000',
    );

    const response = await fetch(`${managementApiUrl}/auth/tenant-status`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
      },
    });

    if (response.status === 401) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (response.status === 403) {
      throw new ForbiddenException('Forbidden');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Tenant access policy unavailable');
    }

    const payload = (await response.json()) as TenantStatusResponse;
    if (!payload.tenant_id || !payload.status) {
      throw new ServiceUnavailableException('Invalid tenant access payload');
    }

    return {
      tenantId: payload.tenant_id,
      status: payload.status,
      readOnly: payload.read_only,
    };
  }
}
