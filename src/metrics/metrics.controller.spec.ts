import type { Response } from 'express';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('sets Prometheus content type and writes metrics payload', async () => {
    const getMetrics = jest.fn().mockResolvedValue('# mock_metrics 1');
    const metricsService = {
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      getMetrics,
    } as unknown as MetricsService;

    const controller = new MetricsController(metricsService);
    const setHeader = jest.fn();
    const send = jest.fn();
    const response = {
      setHeader,
      send,
    } as unknown as Response;

    await controller.metrics(response);

    expect(setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('# mock_metrics 1');
  });
});
