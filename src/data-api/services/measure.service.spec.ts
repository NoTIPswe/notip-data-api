import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { MeasureService } from './measure.service';
import { MeasurePersistenceService } from './measure.persistence.service';
import { MeasureMapper } from './../measure.mapper';

describe('MeasureService', () => {
  let service: MeasureService;
  let mps: jest.Mocked<MeasurePersistenceService>;

  beforeEach(() => {
    mps = {
      paginatedQuery: jest.fn(),
      nonPaginatedQuery: jest.fn(),
    } as unknown as jest.Mocked<MeasurePersistenceService>;

    service = new MeasureService(mps);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('query', () => {
    const input = {
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-01T01:00:00Z',
      cursor: 'cursor-1',
      limit: 100,
    };

    it('should call paginatedQuery and map the result', async () => {
      const persistenceResult = {
        items: [{ id: '1' }],
        nextCursor: 'next-cursor',
      };

      const mappedResult = {
        data: [{ id: '1' }],
        cursor: 'next-cursor',
      };

      mps.paginatedQuery.mockResolvedValue(persistenceResult as any);
      jest
        .spyOn(MeasureMapper, 'toPaginatedQueryModel')
        .mockReturnValue(mappedResult as any);

      const result = await service.query(input as any);

      expect(mps.paginatedQuery).toHaveBeenCalledWith({
        gatewayId: input.gatewayId,
        sensorId: input.sensorId,
        sensorType: input.sensorType,
        from: input.from,
        to: input.to,
        cursor: input.cursor,
        limit: input.limit,
      });
      expect(MeasureMapper.toPaginatedQueryModel).toHaveBeenCalledWith(
        persistenceResult,
      );
      expect(result).toEqual(mappedResult);
    });

    it('should throw BadRequestException on status 400', async () => {
      const error = {
        status: 400,
        response: {
          data: { code: 'QUERY_WINDOW_EXCEEDED', message: 'Window exceeded' },
        },
      };

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on QUERY_WINDOW_EXCEEDED code', async () => {
      const error = {
        code: 'QUERY_WINDOW_EXCEEDED',
        response: {
          data: { code: 'QUERY_WINDOW_EXCEEDED', message: 'Window exceeded' },
        },
      };

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on QUERY_LIMIT_EXCEEDED code', async () => {
      const error = {
        code: 'QUERY_LIMIT_EXCEEDED',
        response: {
          data: { code: 'QUERY_LIMIT_EXCEEDED', message: 'Limit exceeded' },
        },
      };

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException on status 401', async () => {
      const error = {
        status: 401,
        response: {
          data: { message: 'Unauthorized' },
        },
      };

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException on status 403', async () => {
      const error = {
        status: 403,
        response: {
          data: { message: 'Forbidden' },
        },
      };

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should rethrow unknown errors', async () => {
      const error = new Error('Unexpected error');

      mps.paginatedQuery.mockRejectedValue(error);

      await expect(service.query(input as any)).rejects.toThrow(
        'Unexpected error',
      );
    });
  });

  describe('export', () => {
    const input = {
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-01T01:00:00Z',
    };

    it('should call nonPaginatedQuery and map the result', async () => {
      const persistenceResult = [
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
        },
      ];

      const mappedResult = [
        {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
        },
      ];

      mps.nonPaginatedQuery.mockResolvedValue(persistenceResult as any);
      jest
        .spyOn(MeasureMapper, 'toEncryptedEnvelopeModels')
        .mockReturnValue(mappedResult as any);

      const result = await service.export(input as any);

      expect(mps.nonPaginatedQuery).toHaveBeenCalledWith({
        gatewayId: input.gatewayId,
        sensorId: input.sensorId,
        sensorType: input.sensorType,
        from: input.from,
        to: input.to,
      });
      expect(MeasureMapper.toEncryptedEnvelopeModels).toHaveBeenCalledWith(
        persistenceResult,
      );
      expect(result).toEqual(mappedResult);
    });

    it('should throw BadRequestException on status 400', async () => {
      const error = {
        status: 400,
        response: {
          data: {
            code: 'EXPORT_WINDOW_EXCEEDED',
            message: 'Export window exceeded',
          },
        },
      };

      mps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.export(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on EXPORT_WINDOW_EXCEEDED code', async () => {
      const error = {
        code: 'EXPORT_WINDOW_EXCEEDED',
        response: {
          data: {
            code: 'EXPORT_WINDOW_EXCEEDED',
            message: 'Export window exceeded',
          },
        },
      };

      mps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.export(input as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException on status 401', async () => {
      const error = {
        status: 401,
        response: {
          data: { message: 'Unauthorized' },
        },
      };

      mps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.export(input as any)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException on status 403', async () => {
      const error = {
        status: 403,
        response: {
          data: { message: 'Forbidden' },
        },
      };

      mps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.export(input as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should rethrow unknown errors', async () => {
      const error = new Error('Unexpected error');

      mps.nonPaginatedQuery.mockRejectedValue(error);

      await expect(service.export(input as any)).rejects.toThrow(
        'Unexpected error',
      );
    });
  });
});
