import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantAccessGuard } from './tenant-access.guard';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

const createResponse = (status: number, json?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(json),
  }) as unknown as Response;

describe('TenantAccessGuard', () => {
  let guard: TenantAccessGuard;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('https://management-api:3000'),
    } as unknown as ConfigService;
    guard = new TenantAccessGuard(configService);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows root endpoint without authentication', async () => {
    const request = {
      method: 'GET',
      path: '/',
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('rejects missing bearer token on protected endpoints', async () => {
    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows active tenant and stores tenant access context', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(200, {
        tenant_id: 'tenant-1',
        status: 'active',
        read_only: false,
      }),
    );

    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Record<string, unknown>;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.tenantAccess).toEqual({
      tenantId: 'tenant-1',
      status: 'active',
      readOnly: false,
    });
  });

  it('allows suspended tenant in read-only mode', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(200, {
        tenant_id: 'tenant-1',
        status: 'suspended',
        read_only: true,
      }),
    );

    const request = {
      method: 'GET',
      path: '/measures/export',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('rejects suspended tenant on write operations', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(200, {
        tenant_id: 'tenant-1',
        status: 'suspended',
        read_only: true,
      }),
    );

    const request = {
      method: 'POST',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
