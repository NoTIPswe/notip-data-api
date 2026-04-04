import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { TenantId } from './tenant-id.decorator';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe('TenantId decorator', () => {
  class TestController {
    test(@TenantId() _tenantId: string): void {
      void _tenantId;
    }
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as Record<
    string,
    {
      factory: (_data: unknown, ctx: ExecutionContext) => string | undefined;
    }
  >;

  const factory = metadata[Object.keys(metadata)[0]].factory;

  it('returns tenant id when tenant access context exists', () => {
    const request = {
      tenantAccess: {
        tenantId: 'tenant-1',
      },
    };

    expect(factory(undefined, createContext(request))).toBe('tenant-1');
  });

  it('returns undefined when tenant access context is missing', () => {
    expect(factory(undefined, createContext({}))).toBeUndefined();
  });
});
