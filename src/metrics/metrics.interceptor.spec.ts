import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

type MockedMetricsService = jest.Mocked<
  Pick<
    MetricsService,
    'incInFlight' | 'decInFlight' | 'observeHttpRequest' | 'resolveRouteLabel'
  >
>;

describe('MetricsInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through non-http contexts without recording metrics', async () => {
    const metricsService: MockedMetricsService = {
      incInFlight: jest.fn(),
      decInFlight: jest.fn(),
      observeHttpRequest: jest.fn(),
      resolveRouteLabel: jest.fn(),
    };

    const interceptor = new MetricsInterceptor(
      metricsService as unknown as MetricsService,
    );

    const context = {
      getType: jest.fn().mockReturnValue('rpc'),
    } as unknown as ExecutionContext;

    const handle = jest.fn().mockReturnValue(of('ok'));
    const next: CallHandler = {
      handle,
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe('ok');

    expect(handle).toHaveBeenCalledTimes(1);
    expect(metricsService.incInFlight).not.toHaveBeenCalled();
    expect(metricsService.observeHttpRequest).not.toHaveBeenCalled();
    expect(metricsService.decInFlight).not.toHaveBeenCalled();
  });

  it('records metrics for http contexts and uses default method/status values', async () => {
    const metricsService: MockedMetricsService = {
      incInFlight: jest.fn(),
      decInFlight: jest.fn(),
      observeHttpRequest: jest.fn(),
      resolveRouteLabel: jest.fn().mockReturnValue('/measures/query'),
    };

    const interceptor = new MetricsInterceptor(
      metricsService as unknown as MetricsService,
    );

    const request = {
      baseUrl: '/measures',
      route: { path: '/query' },
    };
    const response = {};

    const context = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue(response),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: jest.fn().mockReturnValue(of('ok')),
    };

    jest
      .spyOn(process.hrtime, 'bigint')
      .mockReturnValueOnce(1n)
      .mockReturnValueOnce(2_000_000_001n);

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe('ok');

    expect(metricsService.incInFlight).toHaveBeenCalledWith('UNKNOWN');
    expect(metricsService.resolveRouteLabel).toHaveBeenCalledWith(request);
    expect(metricsService.observeHttpRequest).toHaveBeenCalledWith(
      'UNKNOWN',
      '/measures/query',
      500,
      expect.any(Number),
    );
    expect(metricsService.decInFlight).toHaveBeenCalledWith('UNKNOWN');

    const [, , , durationSeconds] = metricsService.observeHttpRequest.mock
      .calls[0] as [string, string, number, number];
    expect(durationSeconds).toBeCloseTo(2, 6);
  });
});
