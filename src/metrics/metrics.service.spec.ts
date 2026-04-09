import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exposes Prometheus content type and metrics output', async () => {
    const service = new MetricsService();

    expect(service.contentType).toContain('text/plain');

    const metrics = await service.getMetrics();
    expect(metrics).toContain('notip_data_api_http_requests_total');
    expect(metrics).toContain('notip_data_api_http_request_duration_seconds');
    expect(metrics).toContain('notip_data_api_http_requests_in_flight');
  });

  it('tracks in-flight requests and observed request metrics', async () => {
    const service = new MetricsService();

    service.incInFlight('GET');
    service.observeHttpRequest('GET', '/measures/query', 200, 0.123);
    service.decInFlight('GET');

    const metrics = await service.getMetrics();

    expect(metrics).toContain(
      'notip_data_api_http_requests_total{method="GET",route="/measures/query",status_code="200"} 1',
    );
    expect(metrics).toContain(
      'notip_data_api_http_requests_in_flight{method="GET"} 0',
    );
    expect(metrics).toMatch(
      /notip_data_api_http_request_duration_seconds_sum\{method="GET",route="\/measures\/query",status_code="200"\} [0-9.]+/,
    );
  });

  it('resolves route labels from string, array, and unmatched routes', () => {
    const service = new MetricsService();

    expect(
      service.resolveRouteLabel({
        baseUrl: '/api',
        route: { path: '/v1/health' },
      }),
    ).toBe('/api/v1/health');

    expect(
      service.resolveRouteLabel({
        route: { path: ['/v1/items', '/v1/devices'] },
      }),
    ).toBe('/v1/items|/v1/devices');

    expect(
      service.resolveRouteLabel({
        baseUrl: '/api',
        route: { path: { unsupported: true } },
      }),
    ).toBe('_unmatched');

    expect(service.resolveRouteLabel({})).toBe('_unmatched');
  });
});
