import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SensorService } from './sensor.service';
import type { NpQueryPersistenceService } from '../interfaces/np-query-persistence.service';

describe('SensorService', () => {
  let service: SensorService;
  let npqps: { nonPaginatedQuery: jest.Mock };

  beforeEach(() => {
    npqps = {
      nonPaginatedQuery: jest.fn(),
    };

    service = new SensorService(npqps as unknown as NpQueryPersistenceService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSensors', () => {
    const input = {
      gatewayId: 'gw-1',
    };

    it('should call nonPaginatedQuery with gatewayId and a 10-minute window', async () => {
      npqps.nonPaginatedQuery.mockResolvedValue([]);

      const beforeCall = Date.now();
      await service.getSensors(input as any);
      const afterCall = Date.now();

      expect(npqps.nonPaginatedQuery).toHaveBeenCalledTimes(1);

      const calledWith = npqps.nonPaginatedQuery.mock.calls[0][0];

      expect(calledWith.gatewayId).toBe('gw-1');
      expect(typeof calledWith.from).toBe('string');
      expect(typeof calledWith.to).toBe('string');

      const fromMs = new Date(calledWith.from).getTime();
      const toMs = new Date(calledWith.to).getTime();

      expect(toMs).toBeGreaterThanOrEqual(beforeCall);
      expect(toMs).toBeLessThanOrEqual(afterCall + 1000);
      expect(toMs - fromMs).toBe(10 * 60 * 1000);
    });

    it('should return unique sensors from measures', async () => {
      npqps.nonPaginatedQuery.mockResolvedValue([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          time: '2026-03-20T10:00:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-2',
          sensorType: 'humidity',
          time: '2026-03-20T10:01:00.000Z',
        },
      ]);

      const result = await service.getSensors(input as any);

      expect(result).toEqual([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          lastSeen: '2026-03-20T10:00:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-2',
          sensorType: 'humidity',
          lastSeen: '2026-03-20T10:01:00.000Z',
        },
      ]);
    });

    it('should merge duplicate sensors and keep the most recent lastSeen', async () => {
      npqps.nonPaginatedQuery.mockResolvedValue([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          time: '2026-03-20T10:00:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          time: '2026-03-20T10:05:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          time: '2026-03-20T10:03:00.000Z',
        },
      ]);

      const result = await service.getSensors(input as any);

      expect(result).toEqual([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          lastSeen: '2026-03-20T10:05:00.000Z',
        },
      ]);
    });

    it('should treat same sensorId with different sensorType as different sensors', async () => {
      npqps.nonPaginatedQuery.mockResolvedValue([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          time: '2026-03-20T10:00:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'humidity',
          time: '2026-03-20T10:01:00.000Z',
        },
      ]);

      const result = await service.getSensors(input as any);

      expect(result).toEqual([
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          lastSeen: '2026-03-20T10:00:00.000Z',
        },
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'humidity',
          lastSeen: '2026-03-20T10:01:00.000Z',
        },
      ]);
    });

    it('should throw UnauthorizedException on status 401', async () => {
      npqps.nonPaginatedQuery.mockRejectedValue({
        status: 401,
        response: {
          data: { message: 'Unauthorized' },
        },
      });

      await expect(service.getSensors(input as any)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException on status 403', async () => {
      npqps.nonPaginatedQuery.mockRejectedValue({
        status: 403,
        response: {
          data: { message: 'Forbidden' },
        },
      });

      await expect(service.getSensors(input as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException on status 404', async () => {
      npqps.nonPaginatedQuery.mockRejectedValue({
        status: 404,
        response: {
          data: { message: 'Not found' },
        },
      });

      await expect(service.getSensors(input as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should rethrow unknown errors', async () => {
      const error = new Error('Unexpected error');
      npqps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.getSensors(input as any)).rejects.toThrow(
        'Unexpected error',
      );
    });
  });
});