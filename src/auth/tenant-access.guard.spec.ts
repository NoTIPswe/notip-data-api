import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
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
    globalThis.fetch = jest.fn();
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

  it('allows metrics endpoint without authentication', async () => {
    const request = {
      method: 'GET',
      path: '/metrics',
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('allows metrics endpoint when request url includes query string', async () => {
    const request = {
      url: '/metrics?format=prometheus',
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('allows OPTIONS requests without authentication', async () => {
    const request = {
      method: 'OPTIONS',
      path: '/measures/query',
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

  it('rejects empty bearer token values on protected endpoints', async () => {
    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer   ',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows active tenant and stores tenant access context', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
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
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
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

  it('defaults to GET when request method is missing in read-only mode', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(200, {
        tenant_id: 'tenant-1',
        status: 'suspended',
        read_only: true,
      }),
    );

    const request = {
      path: '/measures/export',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('rejects suspended tenant on write operations', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
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

  it('propagates unauthorized when management API returns 401', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(401),
    );

    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('propagates forbidden when management API returns 403', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(403),
    );

    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects when management API is unavailable', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(500),
    );

    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects when tenant access payload is invalid', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      createResponse(200, {
        tenant_id: 'tenant-1',
        read_only: false,
      }),
    );

    const request = {
      method: 'GET',
      path: '/measures/query',
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
