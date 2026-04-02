import { Test, TestingModule } from '@nestjs/testing';
import { MeasureController } from './measure.controller';
import { MeasureService } from './../services/measure.service';
import { MeasureMapper } from './../measure.mapper';
import { StreamListenerService } from '../services/stream-listener.service';
import { PaginatedQueryModel } from '../models/paginated-query.model';
import { QueryResponseDto } from '../dto/query.response.dto';
import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { EncryptedEnvelopeDto } from '../dto/encrypted-envelope.dto';
import { firstValueFrom, of } from 'rxjs';

describe('MeasureController', () => {
  let controller: MeasureController;
  let service: jest.Mocked<MeasureService>;

  const mockMeasureService = {
    query: jest.fn(),
    export: jest.fn(),
  };

  const serviceQueryMock = mockMeasureService.query;
  const serviceExportMock = mockMeasureService.export;

  const mockStreamListenerService = {
    stream: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeasureController],
      providers: [
        {
          provide: MeasureService,
          useValue: mockMeasureService,
        },
        {
          provide: StreamListenerService,
          useValue: mockStreamListenerService,
        },
      ],
    }).compile();

    controller = module.get<MeasureController>(MeasureController);
    service = module.get(MeasureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('query', () => {
    it('should call service.query with the correct input and return mapped response', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';
      const limit = '500';
      const gatewayId = ['gw-1', 'gw-2'];
      const sensorId = ['s-1', 's-2'];
      const sensorType = ['temp', 'hum'];
      const cursor = 'next-cursor';

      const queryModel: PaginatedQueryModel = {
        data: [
          {
            gatewayId: 'gw-1',
            sensorId: 's-1',
            sensorType: 'temp',
            timestamp: '2024-01-01T00:30:00Z',
            encryptedData: 'abc',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: 1,
          },
        ],
        nextCursor: 'next-cursor',
        hasMore: true,
      };

      const queryResponseDto: QueryResponseDto = {
        data: [
          {
            gatewayId: 'gw-1',
            sensorId: 's-1',
            sensorType: 'temp',
            timestamp: '2024-01-01T00:30:00Z',
            encryptedData: 'abc',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: 1,
          },
        ],
        nextCursor: 'next-cursor',
        hasMore: true,
      };

      service.query.mockResolvedValue([queryModel]);

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toQueryResponseDtos')
        .mockReturnValue([queryResponseDto]);

      const result = await controller.query(
        from,
        to,
        limit,
        gatewayId,
        sensorId,
        sensorType,
        cursor,
        'tenant-1',
      );

      expect(serviceQueryMock).toHaveBeenCalledTimes(1);
      expect(serviceQueryMock).toHaveBeenCalledWith({
        from,
        to,
        limit: 500,
        tenantId: 'tenant-1',
        gatewayId,
        sensorId,
        sensorType,
        cursor,
      });
      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(mapperSpy).toHaveBeenCalledWith([queryModel]);
      expect(result).toEqual([queryResponseDto]);
    });

    it('should use default limit = 999 when limit is not provided', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';

      const queryModel: PaginatedQueryModel = {
        data: [],
        nextCursor: undefined,
        hasMore: false,
      };

      const queryResponseDto: QueryResponseDto = {
        data: [],
        nextCursor: undefined,
        hasMore: false,
      };

      service.query.mockResolvedValue([queryModel]);

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toQueryResponseDtos')
        .mockReturnValue([queryResponseDto]);

      const result = await controller.query(
        from,
        to,
        undefined as unknown as string,
        undefined,
        undefined,
        undefined,
        undefined,
        'tenant-1',
      );

      expect(serviceQueryMock).toHaveBeenCalledTimes(1);
      expect(serviceQueryMock).toHaveBeenCalledWith({
        from,
        to,
        limit: 999,
        tenantId: 'tenant-1',
        gatewayId: undefined,
        sensorId: undefined,
        sensorType: undefined,
        cursor: undefined,
      });
      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([queryResponseDto]);
    });

    it('should normalize single-value filters into arrays', async () => {
      service.query.mockResolvedValue([]);

      await controller.query(
        '2024-01-01T00:00:00Z',
        '2024-01-02T00:00:00Z',
        '10',
        'gw-1' as unknown as string[],
        's-1' as unknown as string[],
        'temp' as unknown as string[],
        undefined,
        'tenant-1',
      );

      expect(serviceQueryMock).toHaveBeenCalledWith({
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        limit: 10,
        tenantId: 'tenant-1',
        gatewayId: ['gw-1'],
        sensorId: ['s-1'],
        sensorType: ['temp'],
        cursor: undefined,
      });
    });
  });

  describe('export', () => {
    it('should call service.export with the correct input and return mapped response', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';
      const gatewayId = ['gw-1'];
      const sensorId = ['s-1'];
      const sensorType = ['temp'];

      const exportModel: EncryptedEnvelopeModel[] = [
        {
          gatewayId: 'gw-1',
          sensorId: 's-1',
          sensorType: 'temp',
          timestamp: '2024-01-01T00:30:00Z',
          encryptedData: 'abc123',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 1,
        },
      ];

      const exportResponseDto: EncryptedEnvelopeDto[] = [
        {
          gatewayId: 'gw-1',
          sensorId: 's-1',
          sensorType: 'temp',
          timestamp: '2024-01-01T00:30:00Z',
          encryptedData: 'abc123',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 1,
        },
      ];

      service.export.mockResolvedValue(exportModel);

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toExportResponseDto')
        .mockReturnValue(exportResponseDto);

      const result = await controller.export(
        from,
        to,
        gatewayId,
        sensorId,
        sensorType,
        'tenant-1',
      );

      expect(serviceExportMock).toHaveBeenCalledTimes(1);
      expect(serviceExportMock).toHaveBeenCalledWith({
        from,
        to,
        tenantId: 'tenant-1',
        gatewayId,
        sensorId,
        sensorType,
      });
      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(mapperSpy).toHaveBeenCalledWith(exportModel);
      expect(result).toEqual(exportResponseDto);
    });

    it('should call service.export with undefined optional filters when not provided', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-02T00:00:00Z';

      const exportModel: EncryptedEnvelopeModel[] = [];
      const exportResponseDto: EncryptedEnvelopeDto[] = [];

      service.export.mockResolvedValue(exportModel);

      const mapperSpy = jest
        .spyOn(MeasureMapper, 'toExportResponseDto')
        .mockReturnValue(exportResponseDto);

      const result = await controller.export(
        from,
        to,
        undefined,
        undefined,
        undefined,
        'tenant-1',
      );

      expect(serviceExportMock).toHaveBeenCalledTimes(1);
      expect(serviceExportMock).toHaveBeenCalledWith({
        from,
        to,
        tenantId: 'tenant-1',
        gatewayId: undefined,
        sensorId: undefined,
        sensorType: undefined,
      });
      expect(mapperSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(exportResponseDto);
    });

    it('should normalize single export filters into arrays', async () => {
      service.export.mockResolvedValue([]);

      await controller.export(
        '2024-01-01T00:00:00Z',
        '2024-01-02T00:00:00Z',
        'gw-1' as unknown as string[],
        's-1' as unknown as string[],
        'temp' as unknown as string[],
        'tenant-1',
      );

      expect(serviceExportMock).toHaveBeenCalledWith({
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        tenantId: 'tenant-1',
        gatewayId: ['gw-1'],
        sensorId: ['s-1'],
        sensorType: ['temp'],
      });
    });
  });

  describe('stream', () => {
    it('should pass filters, since and JWT context to the stream listener', async () => {
      const payload = Buffer.from(
        JSON.stringify({
          tenantId: 'tenant-1',
          exp: Math.floor(
            new Date('2026-03-23T10:05:00.000Z').getTime() / 1000,
          ),
        }),
      ).toString('base64url');

      mockStreamListenerService.stream.mockReturnValue(
        of({
          kind: 'data',
          data: {
            gatewayId: 'gw-1',
            sensorId: 'sensor-1',
            sensorType: 'temperature',
            timestamp: '2026-03-23T10:00:00.000Z',
            encryptedData: 'enc',
            iv: 'iv',
            authTag: 'tag',
            keyVersion: 1,
          },
        }),
      );

      const result = await firstValueFrom(
        controller.stream(
          {
            headers: {
              authorization: `Bearer header.${payload}.signature`,
            },
          } as never,
          'gw-1' as never,
          'sensor-1' as never,
          'temperature' as never,
          '2026-03-23T09:50:00.000Z',
          'tenant-1',
        ),
      );

      expect(mockStreamListenerService.stream).toHaveBeenCalledWith({
        gatewayId: ['gw-1'],
        sensorId: ['sensor-1'],
        sensorType: ['temperature'],
        since: '2026-03-23T09:50:00.000Z',
        tenantId: 'tenant-1',
        tokenExpiresAt: new Date('2026-03-23T10:05:00.000Z').getTime(),
      });
      expect(result).toEqual({
        data: {
          gatewayId: 'gw-1',
          sensorId: 'sensor-1',
          sensorType: 'temperature',
          timestamp: '2026-03-23T10:00:00.000Z',
          encryptedData: 'enc',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 1,
        },
      });
    });

    it('should map token_expired to an SSE error event', async () => {
      mockStreamListenerService.stream.mockReturnValue(
        of({
          kind: 'error',
          reason: 'token_expired',
        }),
      );

      const result = await firstValueFrom(
        controller.stream(
          { headers: {} } as never,
          undefined,
          undefined,
          undefined,
          undefined,
          'tenant-1',
        ),
      );

      expect(result).toEqual({
        data: {
          type: 'error',
          reason: 'token_expired',
        },
      });
    });
  });
});
